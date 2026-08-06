/**
 * Article multi-image layouts: stack | grid | carousel.
 *
 * Markup contract (stored in post.content HTML):
 *   <div class="article-gallery article-gallery--{layout}"
 *        data-layout="stack|grid|carousel"
 *        data-columns="2|3"          // grid only
 *        data-image-fit="contain|cover">
 *     <figure class="article-gallery-item">
 *       <img src="..." alt="..." loading="lazy" />
 *     </figure>
 *     ...
 *   </div>
 *
 * Standalone <img> tags remain medium-width singles (CSS).
 * Consecutive bare <img>s without a wrapper are normalized to stack.
 */

export type ArticleGalleryLayout = 'stack' | 'grid' | 'carousel';

export interface GalleryImageRef {
  src: string;
  alt: string;
}

const LAYOUTS = new Set<ArticleGalleryLayout>(['stack', 'grid', 'carousel']);

function normalizeSrc(src: string): string {
  if (!src) return src;
  let s = src.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
  const photon = s.match(/^https?:\/\/i[0-3]\.wp\.com\/([^?]+)/i);
  if (photon) s = 'https://' + photon[1];
  try {
    const u = new URL(s);
    if (
      u.hostname.includes('thecougarchronicle.com') ||
      u.pathname.includes('/wp-content/uploads/')
    ) {
      u.search = '';
      s = u.toString();
    }
  } catch {
    /* keep */
  }
  return s;
}

function parseImgTag(tag: string): GalleryImageRef | null {
  const srcM = tag.match(/\bsrc=(["'])([^"']+)\1/i);
  if (!srcM) return null;
  const altM = tag.match(/\balt=(["'])([^"']*)\1/i);
  return {
    src: normalizeSrc(srcM[2]),
    alt: altM ? altM[2] : '',
  };
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Build gallery HTML for a list of images. */
export function buildArticleGalleryHtml(
  images: GalleryImageRef[],
  layout: ArticleGalleryLayout = 'stack',
  options?: { columns?: number; imageFit?: 'contain' | 'cover' }
): string {
  if (images.length === 0) return '';
  if (images.length === 1) {
    const img = images[0];
    return `<img src="${escapeAttr(img.src)}" alt="${escapeAttr(img.alt)}" loading="lazy">`;
  }

  const cols = Math.min(4, Math.max(2, options?.columns ?? (images.length === 2 ? 2 : 2)));
  const fit = options?.imageFit ?? (layout === 'grid' ? 'cover' : 'contain');
  const layoutSafe = LAYOUTS.has(layout) ? layout : 'stack';

  const items = images
    .map((img) => {
      return (
        `<figure class="article-gallery-item">` +
        `<img src="${escapeAttr(img.src)}" alt="${escapeAttr(img.alt)}" loading="lazy" />` +
        `</figure>`
      );
    })
    .join('');

  return (
    `<div class="article-gallery article-gallery--${layoutSafe} blog-gallery` +
    (layoutSafe === 'grid' ? ` columns-${cols}` : '') +
    `" data-layout="${layoutSafe}" data-columns="${cols}" data-image-fit="${fit}"` +
    (layoutSafe === 'carousel'
      ? ` data-images="${escapeAttr(JSON.stringify(images))}"`
      : '') +
    ` role="group" aria-label="Image ${layoutSafe}">` +
    items +
    `</div>`
  );
}

/**
 * Extract images from a gallery/stack/wp-block-gallery block HTML.
 */
function imagesFromBlock(blockHtml: string): GalleryImageRef[] {
  const tags = [...blockHtml.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  return tags.map(parseImgTag).filter((x): x is GalleryImageRef => Boolean(x?.src));
}

function layoutFromBlock(blockHtml: string): ArticleGalleryLayout {
  const data = blockHtml.match(/\bdata-layout=["'](stack|grid|carousel)["']/i);
  if (data && LAYOUTS.has(data[1] as ArticleGalleryLayout)) {
    return data[1] as ArticleGalleryLayout;
  }
  // Explicit classes
  if (/article-gallery--carousel|is-style-carousel/i.test(blockHtml)) return 'carousel';
  if (/article-gallery--stack|article-image-stack/i.test(blockHtml)) return 'stack';
  if (/article-gallery--grid/i.test(blockHtml)) return 'grid';
  // Prior auto-grid (blog-gallery--article): default to stack so text stays readable
  // until an article is intentionally laid out
  if (/blog-gallery--article/i.test(blockHtml)) return 'stack';
  // Classic WP multi-col gallery without layout → grid
  if (/\bcolumns-[234]\b|data-columns=["'][234]["']/i.test(blockHtml)) return 'grid';
  return 'stack';
}

function columnsFromBlock(blockHtml: string, imageCount: number): number {
  const m =
    blockHtml.match(/\bdata-columns=["'](\d+)["']/i) ||
    blockHtml.match(/\bcolumns-(\d+)\b/i);
  if (m) return Math.min(4, Math.max(2, parseInt(m[1], 10) || 2));
  return imageCount === 2 ? 2 : 2;
}

/**
 * Normalize article body HTML:
 * - Re-emit known gallery wrappers with consistent classes
 * - Wrap consecutive bare <img> runs as stack galleries
 * - Clean jetpack photon URLs on those images
 * - Strip junk "Screenshot" / "No Caption" paragraphs
 */
export function normalizeArticleImageLayouts(html: string): string {
  if (!html || !/<img\b/i.test(html)) return html;

  let out = html;

  // Junk captions
  out = out.replace(/<p[^>]*>\s*(Screenshot|No Caption)\s*<\/p>/gi, '');
  out = out.replace(/<p[^>]*>\s*<\/p>/gi, '');

  // Normalize existing gallery / stack wrappers (including prior blog-gallery--article)
  out = out.replace(
    /<div\b([^>]*class=["'][^"']*(?:blog-gallery|wp-block-gallery|article-gallery|article-image-stack)[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi,
    (full, _attrs: string, inner: string) => {
      const images = imagesFromBlock(inner.length ? inner : full);
      if (images.length < 2) {
        // Unwrap single-image "gallery"
        if (images.length === 1) {
          return `<img src="${escapeAttr(images[0].src)}" alt="${escapeAttr(images[0].alt)}" loading="lazy">`;
        }
        return full;
      }
      const layout = layoutFromBlock(full);
      const columns = columnsFromBlock(full, images.length);
      const fitM = full.match(/\bdata-image-fit=["'](contain|cover)["']/i);
      const fit = (fitM?.[1] as 'contain' | 'cover') || undefined;
      return buildArticleGalleryHtml(images, layout, { columns, imageFit: fit });
    }
  );

  // Consecutive bare imgs (not already inside a gallery we just wrote)
  // After normalization, bare consecutive runs still possible between paragraphs
  out = out.replace(/(?:<img\b[^>]*>\s*){2,}/gi, (block) => {
    // Skip if this match is somehow still inside a gallery (shouldn't after replace)
    const tags = [...block.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const images = tags.map(parseImgTag).filter((x): x is GalleryImageRef => Boolean(x?.src));
    if (images.length < 2) return block;
    return buildArticleGalleryHtml(images, 'stack', { imageFit: 'contain' });
  });

  // Normalize remaining standalone img srcs (photon → origin)
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    // Skip if already processed with loading=lazy and clean src — still normalize src
    const parsed = parseImgTag(tag);
    if (!parsed) return tag;
    // Don't touch imgs already inside article-gallery (they're fine)
    return tag.replace(/\bsrc=(["'])([^"']+)\1/i, (_m, q: string) => {
      return `src=${q}${parsed.src}${q}`;
    });
  });

  return out;
}

/**
 * Heuristic layout chooser for migration of a known multi-image group.
 * Used by one-off article fix scripts; editor sets layout explicitly.
 */
export function suggestLayoutForImages(images: GalleryImageRef[]): ArticleGalleryLayout {
  const names = images.map((i) => i.src.toLowerCase());
  const looksLikeScreenshot = names.some(
    (n) =>
      /screenshot|discord|cdc-|sds-discord/i.test(n) ||
      /11\.15\.|3\.58\.|3\.57\./i.test(n)
  );
  if (looksLikeScreenshot) return 'stack';
  if (images.length >= 4) return 'carousel';
  if (images.length === 2 || images.length === 3) return 'grid';
  return 'stack';
}
