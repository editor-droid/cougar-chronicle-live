const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Uploading cover image...');
    const fileContent = fs.readFileSync('C:\\Users\\carte\\Downloads\\Final_with_covers_Page_001.png');
    const filename = 'vol1_cover.png';
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: filename,
      Body: fileContent,
      ContentType: 'image/png',
    }));

    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}/${filename}`;
    console.log(`Uploaded to ${publicUrl}`);

    console.log('Updating PrintEdition...');
    const result = await client.query(`
      UPDATE "PrintEdition" 
      SET "coverImageUrl" = $1 
      WHERE "title" = 'Volume 1: Standing For Something'
      RETURNING id
    `, [publicUrl]);

    if (result.rowCount > 0) {
      console.log('Successfully updated the cover image for Print Edition!');
    } else {
      console.log('Print Edition not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
