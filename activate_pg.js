const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Activating print edition...');
  
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id FROM "PrintEdition" ORDER BY "createdAt" DESC LIMIT 1');
    if (result.rows.length > 0) {
      const editionId = result.rows[0].id;
      const pdfUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}/Final_with_covers.pdf`;
      await client.query('UPDATE "PrintEdition" SET "isActive" = true, "pdfUrl" = $1 WHERE id = $2', [pdfUrl, editionId]);
      console.log('Print edition activated and updated successfully!');
    } else {
      console.log('No print edition found!');
    }
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
