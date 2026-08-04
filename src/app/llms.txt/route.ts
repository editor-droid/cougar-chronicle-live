import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const [latestPosts, latestVideos] = await Promise.all([
      prisma.post.findMany({
        where: { state: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        select: { title: true, slug: true, content: true, publishedAt: true, category: true, isPremium: true, printEditionId: true }
      }),
      prisma.video.findMany({
        where: { isActive: true },
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: { title: true, slug: true, description: true },
      }),
    ]);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

    const formattedPosts = latestPosts.map(post => {
      const url = `${baseUrl}${getArticleUrl(post)}`;
      const excerpt = post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : '';
      return `- [${post.title}](${url}) (${post.category}) - ${excerpt}`;
    }).join('\n');

    const formattedVideos = latestVideos.map(video => {
      const url = `${baseUrl}/videos/${video.slug}`;
      const blurb = video.description ? video.description.substring(0, 200) : '';
      return `- [${video.title}](${url})${blurb ? ` - ${blurb}` : ''}`;
    }).join('\n');

    const llmsText = `# The Cougar Chronicle

The Cougar Chronicle is an independent student news organization providing the latest news, opinion, and faith-based articles, plus short video features.

## Overview
- **Name**: The Cougar Chronicle
- **Website**: ${baseUrl}
- **Sections**: /news, /opinion, /campus, /politics, /family, /faith, /print-edition, /videos
- **Article URLs**: flat /{slug} (premium/print keep prefixes)
- **Description**: We cover campus news, local events, student life, and opinion pieces with a dedication to truth and journalistic integrity. Video interviews and short features are published at ${baseUrl}/videos and playable on-site.

## Latest Articles
${formattedPosts}

## Videos
Library: ${baseUrl}/videos
${formattedVideos || '- (No videos published yet)'}

## Contact
If you have a story tip, question, or inquiry, you can reach out via the contact form on our website or speak with the Cougar Chronicle AI assistant.
`;

    return new Response(llmsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new Response("Error generating llms.txt", { status: 500 });
  }
}
