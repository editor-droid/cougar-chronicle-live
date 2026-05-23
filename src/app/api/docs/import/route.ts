import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as cheerio from 'cheerio';
import sharp from 'sharp';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing Google Docs URL' }, { status: 400 });
    }

    const docUrl = new URL(url);
    if (!docUrl.hostname.includes("docs.google.com")) {
      return NextResponse.json({ error: "Not a valid Google Docs URL" }, { status: 400 });
    }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ error: "Could not find Document ID in URL" }, { status: 400 });
    }
    const docId = match[1];

    // Export as HTML
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch document. Is it set to 'Anyone with the link can view'?" }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Clean up Google's styles and classes immediately
    $("*").removeAttr("class").removeAttr("style").removeAttr("id");

    const parsedData: any = {
      title: "",
      slug: "",
      category: "news",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      featuredImageAlt: "",
      imageUrl: "",
      keyInsights: "",
      customAuthor: "",
    };

    // 1. Find the first table (Metadata table)
    const firstTable = $("table").first();
    if (firstTable.length) {
      // Parse rows
      firstTable.find("tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length >= 2) {
          const field = $(cells[0]).text().trim().toLowerCase();
          const valueCell = $(cells[1]);
          let valueText = valueCell.text().trim();
          valueText = valueText.replace(/\u00a0/g, " ");
          
          if (field.includes("title") && !field.includes("seo")) {
            parsedData.title = valueText;
          } else if (field.includes("slug")) {
            parsedData.slug = valueText;
          } else if (field.includes("category")) {
            parsedData.category = valueText.toLowerCase();
          } else if (field.includes("seo title")) {
            parsedData.seoTitle = valueText;
          } else if (field.includes("seo description")) {
            parsedData.seoDescription = valueText;
          } else if (field.includes("seo keywords") || field.includes("keywords")) {
            parsedData.seoKeywords = valueText;
          } else if (field.includes("key insights") || field.includes("takeaways")) {
            parsedData.keyInsights = valueText;
          } else if (field.includes("author") || field.includes("byline")) {
            parsedData.customAuthor = valueText;
          } else if (field.includes("cover image") || field.includes("featured image")) {
            const img = valueCell.find("img").first();
            if (img.length) {
              parsedData.imageUrl = img.attr("src") || "";
            }
          }
        }
      });

      // Remove the table from the document
      firstTable.remove();
    }

    // 2. Process all images
    const images = $("img").toArray();
    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      const src = img.attr("src");
      
      if (src && src.startsWith("https://")) {
        try {
          // Download the image
          const imgRes = await fetch(src);
          if (!imgRes.ok) throw new Error("Failed to fetch image");
          
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(new Uint8Array(arrayBuffer));
          
          // Generate a random suffix
          const suffix = Math.random().toString(36).slice(2, 10);
          
          let mimeType = imgRes.headers.get("content-type") || "image/jpeg";
          let ext = mimeType.split("/")[1] || "jpg";
          if (ext === "jpeg") ext = "jpg";

          // Optimize to webp if possible
          let finalBuffer: any = buffer;
          let finalMimeType = mimeType;
          let finalExt = ext;
          const skipConversion = mimeType === "image/svg+xml" || mimeType === "image/gif";
          
          if (!skipConversion) {
            try {
              finalBuffer = await sharp(buffer as any).webp({ quality: 82, effort: 4 }).toBuffer();
              finalMimeType = "image/webp";
              finalExt = "webp";
            } catch {
              // Fallback to original
            }
          }

          const fileKey = `blog-images/imported-${suffix}.${finalExt}`;
          
          const command = new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
            Key: fileKey,
            ContentType: finalMimeType,
            Body: finalBuffer,
          });

          await s3Client.send(command);
          const storedUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}/${fileKey}`;
          
          img.attr("src", storedUrl);

          // If it's the cover image, update it
          if (parsedData.imageUrl === src) {
            parsedData.imageUrl = storedUrl;
          }

        } catch (e) {
          console.error("Failed to process image from doc:", e);
        }
      }
    }

    // 3. Process Alt text [Alt: ...]
    $("p, span, div").each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^\[[aA]lt:(.*?)\]$/);
      if (match) {
        const altText = match[1].trim();
        
        // Find the nearest previous image
        let prevImg = $(el).prevAll("img").first();
        if (!prevImg.length) {
          prevImg = $(el).parent().prevAll().find("img").first();
        }

        if (prevImg.length) {
          prevImg.attr("alt", altText);
          
          if (parsedData.imageUrl && prevImg.attr("src") === parsedData.imageUrl) {
            parsedData.featuredImageAlt = altText;
          }
        }
        $(el).remove();
      }
    });

    // Remove empty paragraphs to clean up
    $("p").each((_, el) => {
      if (!$(el).text().trim() && !$(el).find("img").length && !$(el).find("iframe").length) {
        $(el).remove();
      }
    });

    // 4. Handle standalone YouTube links
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      const ytMatch = text.match(/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) {
          const videoId = ytMatch[3];
          $(el).replaceWith(`<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
      }
    });

    let contentHtml = $("body").html() || "";
    contentHtml = contentHtml.trim();

    return NextResponse.json({
      success: true,
      data: {
        ...parsedData,
        content: contentHtml
      }
    });
  } catch (error) {
    console.error('Failed to import doc', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
