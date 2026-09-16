import { cacheRemoteImageToR2 } from '@/lib/r2-put';
import {
  isSharedMediaUrl,
  rewriteMediaUrl,
  unwrapOptimizedImageSrc,
} from '@/lib/media-url';

const MAX_REHOST = 60;

function decodeAttr(src: string): string {
  return src.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function escapeAttr(src: string): string {
  return src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function collectHtmlImageSrcs(html: string): string[] {
  const found = new Set<string>();
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const srcM = tag[0].match(/\bsrc=(["'])([^"']+)\1/i);
    if (!srcM) continue;
    const src = unwrapOptimizedImageSrc(decodeAttr(srcM[2]));
    if (src && !isSharedMediaUrl(src) && !src.startsWith('blob:')) found.add(src);
  }
  for (const m of html.matchAll(/\bdata-images=(["'])([\s\S]*?)\1/gi)) {
    const raw = decodeAttr(m[2]);
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        const src =
          item && typeof item.src === 'string'
            ? unwrapOptimizedImageSrc(item.src)
            : '';
        if (src && !isSharedMediaUrl(src) && !src.startsWith('blob:')) found.add(src);
      }
    } catch {
      /* ignore malformed gallery JSON */
    }
  }
  return [...found];
}

function replaceSrc(html: string, from: string, to: string): string {
  if (from === to) return html;
  const variants = [from, escapeAttr(from), from.replace(/&/g, '&amp;')];
  let out = html;
  for (const v of [...new Set(variants)]) {
    if (!v || !out.includes(v)) continue;
    out = out.split(v).join(v === from ? to : escapeAttr(to));
  }
  return out;
}

async function rehostOne(url: string): Promise<string> {
  const src = unwrapOptimizedImageSrc(url);
  if (!src) return url;
  if (isSharedMediaUrl(src)) return rewriteMediaUrl(src);
  if (src.startsWith('blob:')) return src;
  const hosted = await cacheRemoteImageToR2(src, 'blog-images');
  return hosted || rewriteMediaUrl(src);
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) || 0 }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Copy paste/hotlink/data-URI images onto R2 and rewrite legacy r2.dev hosts
 * so every editor (and the live site) loads the same public CDN URLs.
 */
export async function persistArticleMedia(html: string | null | undefined): Promise<string> {
  if (!html) return html || '';
  let out = html;
  const srcs = collectHtmlImageSrcs(out).slice(0, MAX_REHOST);
  if (srcs.length === 0) {
    return out.replace(/https?:\/\/pub-[a-f0-9]+\.r2\.dev/gi, (u) =>
      rewriteMediaUrl(u)
    );
  }
  const hosted = await mapPool(srcs, 4, rehostOne);
  for (let i = 0; i < srcs.length; i++) {
    if (hosted[i] && hosted[i] !== srcs[i]) {
      out = replaceSrc(out, srcs[i], hosted[i]);
    }
  }
  return out.replace(/https?:\/\/pub-[a-f0-9]+\.r2\.dev/gi, (u) => rewriteMediaUrl(u));
}

export async function persistMediaUrl(
  url: string | null | undefined
): Promise<string> {
  if (!url) return '';
  return rehostOne(url);
}
