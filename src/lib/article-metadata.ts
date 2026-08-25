/**
 * Shared article metadata for /article, /premium-article, /print-edition.
 * One ruleset so SERP + social previews stay consistent across routes.
 */

import type { Metadata } from 'next';
import { getArticleUrl } from '@/lib/routes';
import { rewriteMediaUrl } from '@/lib/media-url';
import { splitBylineNames } from '@/lib/bylines';

type ArticleMetaPost = {
  title: string;
  slug: string;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  featuredImageAlt: string | null;
  imageUrl: string | null;
  customAuthor: string | null;
  category: string | null;
  isPremium?: boolean;
  printEditionId?: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null } | null;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export function buildArticleMetadata(post: ArticleMetaPost): Metadata {
  // Prefer AI SEO fields; never duplicate site name in <title> (layout template adds it)
  const title = (post.seoTitle || post.title || 'Article').trim().slice(0, 70);
  const plain = post.content ? stripHtml(post.content) : '';
  const description = (
    post.seoDescription ||
    plain.slice(0, 155) ||
    'Read this article on The Cougar Chronicle.'
  )
    .trim()
    .slice(0, 160);

  const keywords = post.seoKeywords
    ? post.seoKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : [];
  const heroImage = rewriteMediaUrl(post.imageUrl) || null;
  const ogAlt = (post.featuredImageAlt || post.title || 'The Cougar Chronicle').slice(0, 125);
  const authorName = post.customAuthor || post.author?.name || 'The Cougar Chronicle';
  const authorNames = splitBylineNames(authorName);
  const authorsList = (authorNames.length ? authorNames : [authorName]).map((name) => ({ name }));
  const canonical = getArticleUrl(post);
  const ogTitle = `${title} | The Cougar Chronicle`;

  return {
    title,
    description,
    keywords,
    authors: authorsList,
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description,
      type: 'article',
      url: canonical,
      siteName: 'The Cougar Chronicle',
      locale: 'en_US',
      images: heroImage
        ? [{ url: heroImage, alt: ogAlt, width: 1200, height: 630 }]
        : [{ url: '/images/default-article.jpg', width: 1080, height: 720, alt: 'The Cougar Chronicle' }],
      publishedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: authorNames.length ? authorNames : [authorName],
      section: post.category || undefined,
      tags: keywords.length ? keywords : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: heroImage ? [heroImage] : ['/images/default-article.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}
