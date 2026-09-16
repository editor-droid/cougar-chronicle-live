import { isSharedMediaUrl, rewriteMediaUrl, unwrapOptimizedImageSrc } from '@/lib/media-url';

export async function uploadImageFile(file: File): Promise<string> {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'image/jpeg' }),
  });
  if (!response.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, publicUrl } = await response.json();
  if (!uploadUrl || !publicUrl) throw new Error('Failed to get upload URL');
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!uploadRes.ok) throw new Error('Failed to upload file to storage');
  return rewriteMediaUrl(publicUrl);
}

export async function rehostRemoteImage(url: string): Promise<string> {
  const src = unwrapOptimizedImageSrc(url);
  if (!src) return url;
  if (src.startsWith('blob:')) {
    const blob = await fetch(src).then((r) => r.blob());
    const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const file = new File([blob], `pasted.${ext}`, { type: blob.type || 'image/png' });
    return uploadImageFile(file);
  }
  if (src.startsWith('data:image/')) {
    const blob = await fetch(src).then((r) => r.blob());
    const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const file = new File([blob], `pasted.${ext}`, { type: blob.type || 'image/png' });
    return uploadImageFile(file);
  }
  if (isSharedMediaUrl(src)) return rewriteMediaUrl(src);

  const res = await fetch('/api/upload/rehost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: src }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.publicUrl) {
    throw new Error(data?.error || 'Failed to import image');
  }
  return rewriteMediaUrl(data.publicUrl as string);
}

export async function rewritePastedHtmlImages(html: string): Promise<string> {
  const srcs = [
    ...new Set(
      [...html.matchAll(/\bsrc=(["'])([^"']+)\1/gi)].map((m) =>
        unwrapOptimizedImageSrc(m[2].replace(/&amp;/g, '&'))
      )
    ),
  ].filter(Boolean);

  const needWork = srcs.filter((s) => !isSharedMediaUrl(s));
  if (needWork.length === 0) return html;

  let out = html;
  for (const src of needWork) {
    try {
      const hosted = await rehostRemoteImage(src);
      if (hosted && hosted !== src) {
        out = out.split(src).join(hosted);
        out = out.split(src.replace(/&/g, '&amp;')).join(hosted);
      }
    } catch (e) {
      console.error('Failed to rehost pasted image', src.slice(0, 120), e);
    }
  }
  return out;
}
