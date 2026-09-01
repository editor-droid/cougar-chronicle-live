import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';

export const revalidate = 300;

const SITE_ORIGIN = 'https://thecougarchronicle.com';
const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;
const PREFERRED_CATEGORIES = ['news', 'campus', 'politics'];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const cutoff = new Date(Date.now() - NEWS_WINDOW_MS);

  const posts = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      slug: { not: '' },
      publishedAt: {
        gte: cutoff,
        lte: new Date(),
      },
    },
    select: {
      title: true,
      slug: true,
      publishedAt: true,
      category: true,
      isPremium: true,
      printEditionId: true,
    },
  });

  const recent = posts
    .filter((post) => post.slug && post.slug.trim().length > 0)
    .sort((a, b) => {
      const aPref = PREFERRED_CATEGORIES.indexOf(a.category);
      const bPref = PREFERRED_CATEGORIES.indexOf(b.category);
      const aRank = aPref === -1 ? PREFERRED_CATEGORIES.length : aPref;
      const bRank = bPref === -1 ? PREFERRED_CATEGORIES.length : bPref;
      if (aRank !== bRank) return aRank - bRank;
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    });

  const urls = recent
    .map((post) => {
      const loc = `${SITE_ORIGIN}${getArticleUrl(post)}`;
      const publicationDate = (post.publishedAt ?? cutoff).toISOString();
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>The Cougar Chronicle</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(publicationDate)}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
