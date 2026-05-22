import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  const res = await client.query('SELECT * FROM "Subscriber"');
  console.log('Subscribers:', res.rows);
  await client.end();
}

main().catch(console.error);
