import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { publicMediaBase } from '@/lib/media-url';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
  },
});

const MAX_BYTES = 8 * 1024 * 1024;

function extForContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('avif')) return 'avif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
}

/** Store an image buffer on R2; returns public CDN URL. */
export async function putImageBufferToR2(
  buf: Buffer,
  contentType: string,
  keyPrefix = 'blog-images'
): Promise<string | null> {
  if (!buf.length || buf.length > MAX_BYTES) return null;
  const type = (contentType || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
  if (!type.startsWith('image/')) return null;

  const key = `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extForContentType(type)}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
      Body: buf,
      ContentType: type,
    })
  );
  return `${publicMediaBase()}/${key}`;
}

function parseDataImageUrl(url: string): { buf: Buffer; contentType: string } | null {
  const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+)(;charset=[^;]+)?(;base64)?,([\s\S]*)$/);
  if (!m) return null;
  const contentType = m[1];
  const isB64 = Boolean(m[3]);
  const data = m[4];
  try {
    const buf = isB64
      ? Buffer.from(data, 'base64')
      : Buffer.from(decodeURIComponent(data), 'utf8');
    return { buf, contentType };
  } catch {
    return null;
  }
}

/** Download a remote image (or decode a data: URL) and store it on R2. */
export async function cacheRemoteImageToR2(
  remoteUrl: string,
  keyPrefix = 'linkhub'
): Promise<string | null> {
  try {
    if (remoteUrl.startsWith('data:image/')) {
      const parsed = parseDataImageUrl(remoteUrl);
      if (!parsed) return null;
      return putImageBufferToR2(parsed.buf, parsed.contentType, keyPrefix);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'image/*,*/*',
        'User-Agent': 'CougarChronicle/1.0 (media-rehost)',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!contentType.startsWith('image/')) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    return putImageBufferToR2(buf, contentType, keyPrefix);
  } catch (e) {
    console.error('cacheRemoteImageToR2', e);
    return null;
  }
}
