// Inline copy of rewrite for quick test (no TS import)
const LEGACY_R2_HOST_RE = /https?:\/\/pub-[a-f0-9]+\.r2\.dev/gi;
function publicMediaBase() {
  return 'https://cdn.thecougarchronicle.com';
}
function rewriteMediaUrl(url) {
  if (!url) return '';
  if (!/pub-[a-f0-9]+\.r2\.dev/i.test(url)) return url;
  return url.replace(LEGACY_R2_HOST_RE, publicMediaBase());
}
function isOurMediaUrl(src) {
  return /cdn\.thecougarchronicle\.com|pub-[a-f0-9]+\.r2\.dev|r2\.cloudflarestorage\.com/i.test(src);
}
function rewriteArticleImagesThroughOptimizer(html) {
  if (!html || !/<img\b/i.test(html)) return html;
  return html.replace(
    /<img\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*)>/gi,
    (full, pre, quote, src, post) => {
      if (!src || src.startsWith('/_next/image') || src.startsWith('data:')) return full;
      const decoded = src.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      if (!isOurMediaUrl(decoded)) return full;
      const clean = rewriteMediaUrl(decoded);
      const widthMatch = full.match(/\bdata-width=["']?(\d+)/i) || full.match(/\bwidth:\s*(\d+)px/i);
      const w = Math.min(1920, Math.max(640, widthMatch ? parseInt(widthMatch[1], 10) * 2 : 1920));
      const optimized = `/_next/image?url=${encodeURIComponent(clean)}&w=${w}&q=75`;
      return `<img${pre}src=${quote}${optimized}${quote}${post}>`;
    }
  );
}

// Real DB tag
const html = `<p></p><img src="https://cdn.thecougarchronicle.com/1784092261966-yudnich_photo.jpeg" alt="" data-width="700" data-height="387" style="width: 700px; max-width: 100%; height: auto;"><p>more</p>`;
console.log('OUT:', rewriteArticleImagesThroughOptimizer(html));

// src not first
const html2 = `<img alt="x" class="foo" src="https://cdn.thecougarchronicle.com/x.jpg" />`;
console.log('OUT2:', rewriteArticleImagesThroughOptimizer(html2));

// unquoted? unlikely
const html3 = `<img src=https://cdn.thecougarchronicle.com/x.jpg>`;
console.log('OUT3:', rewriteArticleImagesThroughOptimizer(html3));
