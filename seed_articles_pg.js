const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    // Get the default user
    const userRes = await client.query('SELECT id FROM "User" LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No user found');
      return;
    }
    const userId = userRes.rows[0].id;

    // Create PrintEdition
    const pdfUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}/Final_with_covers.pdf`;
    const coverUrl = 'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev/vol1_cover.jpg';
    
    // Generate an ID for PrintEdition
    const { randomUUID } = require('crypto');
    const editionId = randomUUID();

    await client.query(`
      INSERT INTO "PrintEdition" (id, title, "pdfUrl", "coverImageUrl", "isActive", "createdAt") 
      VALUES ($1, $2, $3, $4, true, NOW())
    `, [editionId, 'Volume 1: Standing For Something', pdfUrl, coverUrl]);
    
    console.log('Created Print Edition');

    // Read articles
    const data = JSON.parse(fs.readFileSync('articles.json', 'utf8'));
    
    for (const article of data) {
      const articleId = randomUUID();
      await client.query(`
        INSERT INTO "Post" (id, "authorId", title, content, state, slug, "customAuthor", category, "isPremium", "createdAt", "updatedAt", "printEditionId")
        VALUES ($1, $2, $3, $4, 'PUBLISHED', $5, $6, 'Opinion', true, NOW(), NOW(), $7)
        ON CONFLICT (slug) DO UPDATE 
        SET "printEditionId" = EXCLUDED."printEditionId", state = 'PUBLISHED'
      `, [articleId, userId, article.title, article.content, article.slug, article.customAuthor, editionId]);
      
      console.log(`Seeded: ${article.title}`);
    }

    console.log("All articles seeded!");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
}

seed().finally(() => pool.end());
