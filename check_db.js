const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, title, "isActive" FROM "PrintEdition"');
    console.log("Editions:", result.rows);
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
