const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Reading PDF...');
  const filePath = 'C:\\Users\\carte\\Downloads\\Final_with_covers.pdf';
  const pdfBytes = fs.readFileSync(filePath);
  
  console.log('Sending PDF to Gemini 2.5 Flash...');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  console.log('Connecting to database to update articles...');
  const client = await pool.connect();
  try {
    const dbRes = await client.query(`
      SELECT p.id, p.title 
      FROM "Post" p
      JOIN "PrintEdition" e ON p."printEditionId" = e.id
    `);
    
    const dbArticles = dbRes.rows;
    console.log(`Found ${dbArticles.length} articles to process.`);

    let updatedCount = 0;
    for (let i = 0; i < dbArticles.length; i += 3) {
      const batch = dbArticles.slice(i, i + 3);
      const titlesToExtract = batch.map(a => a.title).join('", "');
      
      console.log(`\nProcessing batch ${Math.floor(i/3) + 1}... Extracting: "${titlesToExtract}"`);
      
      const prompt = `
You are an expert newspaper editor and HTML formatter.
I am providing you with a PDF of a newspaper issue.
Please find and extract ONLY the following ${batch.length} articles from this PDF:
"${titlesToExtract}"

For each article, extract the title, the author's name, and the full content of the article.
Format the content of each article as rich HTML.
CRITICAL: You MUST accurately preserve all formatting present in the PDF.
- If text is bold in the PDF, wrap it in <strong> or <b> tags.
- If text is italicized, wrap it in <em> or <i> tags.
- Use <h2> or <h3> for subheadings within the text.
- Use <p> for paragraphs.
- Use <blockquote> for pull quotes.
- EXCLUDE all headers, footers, page numbers, and unrelated text.

Return the result STRICTLY as a JSON array of objects, with NO markdown formatting around the output (do not wrap in \`\`\`json).
Each object should have this schema:
{
  "title": "Exact Article Title",
  "author": "Author Name",
  "htmlContent": "<p>Formatted <strong>HTML</strong> content...</p>"
}
      `;

      try {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: pdfBytes.toString("base64"), mimeType: "application/pdf" } }
            ]
          }],
          generationConfig: { maxOutputTokens: 8192 }
        });
        
        let text = result.response.text();
        if (text.startsWith('\`\`\`json')) text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
        else if (text.startsWith('\`\`\`')) text = text.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
        
        const articles = JSON.parse(text);
        for (const geminiArticle of articles) {
          const match = batch.find(dba => 
            dba.title.toLowerCase().includes(geminiArticle.title.toLowerCase()) || 
            geminiArticle.title.toLowerCase().includes(dba.title.toLowerCase())
          );
          
          if (match) {
            await client.query(`
              UPDATE "Post"
              SET content = $1, "customAuthor" = $2
              WHERE id = $3
            `, [geminiArticle.htmlContent, geminiArticle.author, match.id]);
            updatedCount++;
            console.log(`✅ Updated: ${match.title}`);
          }
        }
      } catch (e) {
        console.error("Failed for this batch:", e.message);
      }
      
      // Sleep for 10 seconds to avoid rate limits
      await new Promise(r => setTimeout(r, 10000));
    }
    
    console.log(`\nSuccessfully updated ${updatedCount} out of ${dbArticles.length} articles!`);
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
