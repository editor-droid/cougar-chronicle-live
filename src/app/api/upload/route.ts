import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { publicMediaBase } from '@/lib/media-url';
import { staffCanUpload, planStaffUpload } from '@/lib/upload-policy';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
  // Default checksums sign an empty-body CRC into the URL. R2 would then
  // reject the real file. WHEN_REQUIRED leaves content-length as the size cap.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!staffCanUpload(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { filename, contentType, size } = await request.json();
    const planned = planStaffUpload({ filename, contentType, size });
    if (!planned.ok) {
      return NextResponse.json({ error: planned.error }, { status: 400 });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: planned.upload.key,
      ContentType: planned.upload.contentType,
      ContentLength: planned.upload.contentLength,
    });

    // Presigned PUT is valid for 5 minutes. Content-Length is a signed header,
    // so the browser must upload exactly `size` bytes.
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const publicUrl = `${publicMediaBase()}/${planned.upload.key}`;

    return NextResponse.json({
      uploadUrl: signedUrl,
      publicUrl: publicUrl,
    });
  } catch (error) {
    console.error('Failed to generate presigned URL', error);
    return NextResponse.json(
      { error: 'Could not prepare upload' },
      { status: 500 }
    );
  }
}
