import prisma from '@/lib/prisma';
import { parseStreamUid } from '@/lib/embed-utils';
import {
  buildVideoObjectJsonLd,
  fetchStreamDetails,
  fetchYoutubeOEmbed,
  parseYoutubeId,
  slugifyVideoTitle,
  streamContentUrl,
  streamEmbedUrl,
  streamThumbnailUrl,
  type PublicVideo,
  type VideoPlatformName,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/videos';
import { getArticleUrl } from '@/lib/routes';
import { withUniquenessSuffix } from '@/lib/slug';
import { categoryLabel, getSectionPath } from '@/lib/categories';
import { schemaAuthors } from '@/lib/bylines';

export type ArticleVideoEmbed = {
  platform: VideoPlatformName;
  externalId: string;
  embedUrl: string;
};

/**
 * Find YouTube + Cloudflare Stream embeds in article HTML
 * (TipTap data-video-embed wrappers and raw iframes). Instagram is skipped
 * (no Video library platform / weak VideoObject support).
 */
export function extractArticleVideoEmbeds(
  html: string | null | undefined
): ArticleVideoEmbed[] {
  if (!html) return [];
  const found: ArticleVideoEmbed[] = [];
  const seen = new Set<string>();

  const add = (platform: VideoPlatformName, externalId: string, embedUrl: string) => {
    const key = `${platform}:${externalId}`;
    if (!externalId || seen.has(key)) return;
    seen.add(key);
    found.push({ platform, externalId, embedUrl });
  };

  // data-src / data-provider on our embed wrappers
  const dataSrcRe =
    /data-provider=["'](youtube|stream)["'][^>]*data-src=["']([^"']+)["']|data-src=["']([^"']+)["'][^>]*data-provider=["'](youtube|stream)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = dataSrcRe.exec(html)) !== null) {
    const provider = (m[1] || m[4] || '').toLowerCase();
    const src = m[2] || m[3] || '';
    if (provider === 'youtube') {
      const id = parseYoutubeId(src);
      if (id) add('YOUTUBE', id, youtubeEmbedUrl(id));
    } else if (provider === 'stream') {
      const uid = parseStreamUid(src);
      if (uid) {
        add(
          'STREAM',
          uid,
          streamEmbedUrl(uid, {
            letterboxColor: 'transparent',
            primaryColor: '#1b2253',
          })
        );
      }
    }
  }

  // Any iframe src pointing at YT / Stream
  const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((m = iframeRe.exec(html)) !== null) {
    const src = m[1];
    if (/instagram\.com/i.test(src)) continue;
    if (/youtube\.com|youtu\.be/i.test(src)) {
      const id = parseYoutubeId(src);
      if (id) add('YOUTUBE', id, youtubeEmbedUrl(id));
      continue;
    }
    if (/cloudflarestream|videodelivery/i.test(src)) {
      const uid = parseStreamUid(src);
      if (uid) {
        add(
          'STREAM',
          uid,
          streamEmbedUrl(uid, {
            letterboxColor: 'transparent',
            primaryColor: '#1b2253',
          })
        );
      }
    }
  }

  return found;
}

async function uniqueVideoSlug(title: string): Promise<string> {
  const base = slugifyVideoTitle(title);
  let n = 0;
  while (true) {
    const slug = withUniquenessSuffix(base, n);
    const existing = await prisma.video.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    n += 1;
  }
}

function plainExcerpt(html: string | null | undefined, max = 280): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export type ArticleLikeForVideos = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  category?: string | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
  seoKeywords?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date;
  isPremium?: boolean;
  printEditionId?: string | null;
};

/**
 * When an article is published (or a published article is saved), ensure every
 * Stream/YouTube embed also has a Video library row → /videos/[slug].
 * Does not send email/push (article broadcast already covers the story).
 */
export async function syncArticleVideosToLibrary(
  post: ArticleLikeForVideos
): Promise<{ created: number; existing: number }> {
  const embeds = extractArticleVideoEmbeds(post.content);
  if (embeds.length === 0) return { created: 0, existing: 0 };

  let created = 0;
  let existing = 0;
  const baseDesc =
    post.seoDescription?.trim() ||
    plainExcerpt(post.content) ||
    `${post.title} — video from The Cougar Chronicle.`;
  const articlePath = getArticleUrl(post);
  const publishedAt = post.publishedAt || post.createdAt || new Date();

  for (let i = 0; i < embeds.length; i++) {
    const emb = embeds[i];
    const already = await prisma.video.findFirst({
      where: {
        platform: emb.platform,
        externalId: emb.externalId,
      },
      select: { id: true },
    });
    if (already) {
      existing += 1;
      continue;
    }

    const title =
      embeds.length === 1
        ? post.title
        : `${post.title} (video ${i + 1})`;

    // Plain URL is linkified on the video page into a clickable article link
    let description = `${baseDesc}\n\nFeatured in: https://thecougarchronicle.com${articlePath}`;
    if (description.length > 4000) description = description.slice(0, 4000);

    try {
      if (emb.platform === 'STREAM') {
        const streamMeta = await fetchStreamDetails(emb.externalId);
        const slug = await uniqueVideoSlug(title);
        await prisma.video.create({
          data: {
            title,
            slug,
            description,
            seoTitle: post.seoTitle || title,
            seoKeywords: post.seoKeywords || null,
            platform: 'STREAM',
            externalId: emb.externalId,
            sourceUrl: null,
            embedUrl: emb.embedUrl,
            thumbnailUrl:
              streamMeta?.thumbnailUrl || streamThumbnailUrl(emb.externalId),
            contentUrl: streamContentUrl(emb.externalId),
            durationSec: streamMeta?.durationSec ?? null,
            width: streamMeta?.width ?? null,
            height: streamMeta?.height ?? null,
            // Live on /videos; keep sidebar quieter unless editors promote
            showOnHome: true,
            showInSidebar: false,
            isActive: true,
            publishedAt,
          },
        });
        created += 1;
      } else {
        const oembed = await fetchYoutubeOEmbed(emb.externalId);
        const ytTitle = oembed?.title || title;
        const slug = await uniqueVideoSlug(ytTitle);
        await prisma.video.create({
          data: {
            title: ytTitle,
            slug,
            description,
            seoTitle: post.seoTitle || ytTitle,
            seoKeywords: post.seoKeywords || null,
            platform: 'YOUTUBE',
            externalId: emb.externalId,
            sourceUrl: youtubeWatchUrl(emb.externalId),
            embedUrl: youtubeEmbedUrl(emb.externalId),
            thumbnailUrl:
              oembed?.thumbnailUrl || youtubeThumbnailUrl(emb.externalId),
            contentUrl: youtubeWatchUrl(emb.externalId),
            durationSec: null,
            showOnHome: true,
            showInSidebar: false,
            isActive: true,
            publishedAt,
          },
        });
        created += 1;
      }
    } catch (e) {
      console.error(
        `[article-videos] failed to create Video for ${emb.platform}:${emb.externalId}`,
        e
      );
    }
  }

  return { created, existing };
}

/** VideoObject nodes (no @context) for nesting under NewsArticle.video */
export function buildNestedVideoObjects(
  videos: PublicVideo[],
  articleUrl: string
): Record<string, unknown>[] {
  return videos.map((v) => {
    const full = buildVideoObjectJsonLd(
      v,
      v.slug ? undefined : articleUrl
    );
    // Prefer dedicated /videos page when we have a library slug
    if (v.slug) {
      const withPage = buildVideoObjectJsonLd(v);
      const { '@context': _c, ...rest } = withPage as Record<string, unknown> & {
        '@context'?: string;
      };
      return {
        ...rest,
        // Also associate with the article that embeds it
        isPartOf: {
          '@type': 'NewsArticle',
          url: articleUrl,
          name: v.title,
        },
      };
    }
    const { '@context': _c, ...rest } = full as Record<string, unknown> & {
      '@context'?: string;
    };
    return rest;
  });
}

/**
 * Resolve embeds → PublicVideo-shaped objects (library first, then lightweight fallbacks).
 */
export async function resolveArticleVideosForSchema(
  post: ArticleLikeForVideos
): Promise<PublicVideo[]> {
  const embeds = extractArticleVideoEmbeds(post.content);
  if (embeds.length === 0) return [];

  const out: PublicVideo[] = [];
  const publishedAt = post.publishedAt || post.createdAt || new Date();
  const fallbackDesc =
    post.seoDescription?.trim() ||
    plainExcerpt(post.content, 200) ||
    post.title;

  for (const emb of embeds) {
    const row = await prisma.video.findFirst({
      where: {
        platform: emb.platform,
        externalId: emb.externalId,
        isActive: true,
      },
    });
    if (row) {
      out.push({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        seoTitle: row.seoTitle,
        seoKeywords: row.seoKeywords,
        platform: row.platform as VideoPlatformName,
        externalId: row.externalId,
        embedUrl: row.embedUrl,
        thumbnailUrl: row.thumbnailUrl,
        contentUrl: row.contentUrl,
        durationSec: row.durationSec,
        publishedAt: row.publishedAt,
      });
      continue;
    }

    // Fallback schema if library sync hasn't run yet
    if (emb.platform === 'STREAM') {
      out.push({
        id: emb.externalId,
        title: post.title,
        description: fallbackDesc,
        seoTitle: post.seoTitle,
        seoKeywords: post.seoKeywords,
        platform: 'STREAM',
        externalId: emb.externalId,
        embedUrl: emb.embedUrl,
        thumbnailUrl: streamThumbnailUrl(emb.externalId),
        contentUrl: streamContentUrl(emb.externalId),
        durationSec: null,
        publishedAt,
      });
    } else {
      out.push({
        id: emb.externalId,
        title: post.title,
        description: fallbackDesc,
        seoTitle: post.seoTitle,
        seoKeywords: post.seoKeywords,
        platform: 'YOUTUBE',
        externalId: emb.externalId,
        embedUrl: emb.embedUrl,
        thumbnailUrl: youtubeThumbnailUrl(emb.externalId),
        contentUrl: youtubeWatchUrl(emb.externalId),
        durationSec: null,
        publishedAt,
      });
    }
  }

  return out;
}

/**
 * NewsArticle JSON-LD with optional video: VideoObject | VideoObject[].
 * Best practice for Google: article + embedded video in one graph.
 */
export async function buildNewsArticleJsonLdWithVideos(
  post: ArticleLikeForVideos & {
    imageUrl?: string | null;
    customAuthor?: string | null;
    author?: { name: string | null } | null;
    updatedAt?: Date;
  },
  extras?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const articleUrl = `https://thecougarchronicle.com${getArticleUrl(post)}`;
  const videos = await resolveArticleVideosForSchema(post);
  const nested = buildNestedVideoObjects(videos, articleUrl);

  const sectionName = post.category ? categoryLabel(post.category) : undefined;
  const sectionPath = post.category ? getSectionPath(post.category) : undefined;
  const origin = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://thecougarchronicle.com'
  ).replace(/\/$/, '');

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    image: post.imageUrl ? [post.imageUrl] : [],
    datePublished: (
      post.publishedAt ||
      post.createdAt ||
      new Date()
    ).toISOString(),
    dateModified: (post.updatedAt || post.publishedAt || post.createdAt || new Date()).toISOString(),
    author: schemaAuthors(post.customAuthor || post.author?.name || 'Staff'),
    publisher: {
      '@type': 'Organization',
      name: 'The Cougar Chronicle',
      logo: {
        '@type': 'ImageObject',
        url: 'https://thecougarchronicle.com/icon.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    url: articleUrl,
    ...(sectionName
      ? {
          articleSection: sectionName,
          isPartOf: sectionPath
            ? {
                '@type': 'CollectionPage',
                name: sectionName,
                url: `${origin}${sectionPath}`,
              }
            : undefined,
        }
      : {}),
    ...extras,
  };

  if (nested.length === 1) {
    jsonLd.video = nested[0];
  } else if (nested.length > 1) {
    jsonLd.video = nested;
  }

  return jsonLd;
}
