import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
});

/** Download a remote image and store it on R2; returns public CDN URL. */
export async function cacheRemoteImageToR2(
  remoteUrl: string,
  keyPrefix = 'linkhub'
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'image/*,*/*' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!contentType.startsWith('image/')) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return null; // 8MB cap

    const ext =
      contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : contentType.includes('gif')
            ? 'gif'
            : contentType.includes('avif')
              ? 'avif'
              : 'jpg';

    const key = `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
        Key: key,
        Body: buf,
        ContentType: contentType,
      })
    );

    const base = (process.env.CLOUDFLARE_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}/${key}` : null;
  } catch (e) {
    console.error('cacheRemoteImageToR2', e);
    return null;
  }
}
