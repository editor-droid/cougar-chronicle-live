import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  console.log('Uploading PDF...');
  const fileContent = fs.readFileSync('C:\\Users\\carte\\Downloads\\Final_with_covers.pdf');
  const filename = 'Final_with_covers.pdf';
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
    Key: filename,
    Body: fileContent,
    ContentType: 'application/pdf',
  }));

  const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}/${filename}`;
  console.log(`Uploaded to ${publicUrl}`);

  console.log('Activating print edition and linking PDF...');
  const edition = await prisma.printEdition.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (edition) {
    await prisma.printEdition.update({
      where: { id: edition.id },
      data: {
        isActive: true,
        pdfUrl: publicUrl
      }
    });
    console.log('Print edition activated and updated successfully!');
  } else {
    console.log('No print edition found!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
