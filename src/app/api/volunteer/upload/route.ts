import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { rateLimit } from '@/lib/rate-limit';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
});

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
]);

/** Public, rate-limited presign for application writing-sample PDFs only. */
export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const { success } = rateLimit(`vol-upload:${ip}`, 8, 15 * 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      );
    }

    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing filename or contentType' },
        { status: 400 }
      );
    }

    const type = String(contentType).toLowerCase().split(';')[0].trim();
    const isPdfName = /\.pdf$/i.test(filename);
    if (!ALLOWED_TYPES.has(type) && !isPdfName) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed for writing samples.' },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 120);
    const uniqueFilename = `applications/${Date.now()}-${safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`}`;

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: 'application/pdf',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}/${uniqueFilename}`;

    return NextResponse.json({
      uploadUrl: signedUrl,
      publicUrl,
    });
  } catch (error) {
    console.error('Volunteer upload presign failed', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Upload failed' },
      { status: 500 }
    );
  }
}
