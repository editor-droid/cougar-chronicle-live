const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      UPDATE "Post" 
      SET state = 'DRAFT' 
      WHERE "printEditionId" IS NOT NULL
    `);
    console.log(`Reverted ${res.rowCount} posts to DRAFT`);
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
