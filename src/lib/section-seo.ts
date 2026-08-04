/**
 * Section (hub) page SEO — CollectionPage + ItemList + BreadcrumbList.
 * Matches Google news-site best practice for section indexes.
 */

import type { Metadata } from 'next';
import {
  getSection,
  getSectionPath,
  type PublicSectionSlug,
} from '@/lib/categories';
import { getArticleUrl } from '@/lib/routes';

const SITE = 'The Cougar Chronicle';

function siteOrigin(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://thecougarchronicle.com'
  ).replace(/\/$/, '');
}

export function buildSectionMetadata(slug: PublicSectionSlug): Metadata {
  const section = getSection(slug)!;
  const path = getSectionPath(slug);
  const absolute = `${siteOrigin()}${path}`;
  const title = section.title;
  const description = section.description;

  return {
    title,
    description,
    keywords: [...section.keywords],
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | ${SITE}`,
      description,
      url: absolute,
      siteName: SITE,
      locale: 'en_US',
      type: 'website',
      images: [{ url: '/default-og.png', width: 1200, height: 630, alt: SITE }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE}`,
      description,
      images: ['/default-og.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

type ListPost = {
  title: string;
  slug: string;
  isPremium?: boolean;
  printEditionId?: string | null;
  imageUrl?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date;
};

export function buildSectionJsonLd(
  slug: PublicSectionSlug,
  posts: ListPost[],
  opts?: { page?: number }
) {
  const section = getSection(slug)!;
  const home = siteOrigin();
  const pageUrl = `${home}${getSectionPath(slug)}`;
  const page = opts?.page && opts.page > 1 ? opts.page : 1;
  const listUrl = page > 1 ? `${pageUrl}?page=${page}` : pageUrl;

  const itemListElement = posts.map((post, i) => ({
    '@type': 'ListItem',
    position: i + 1 + (page - 1) * 18,
    url: `${home}${getArticleUrl(post)}`,
    name: post.title,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${listUrl}#webpage`,
        url: listUrl,
        name: `${section.title} | ${SITE}`,
        description: section.description,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE,
          url: home,
        },
        about: {
          '@type': 'Thing',
          name: section.label,
        },
        inLanguage: 'en-US',
      },
      {
        '@type': 'ItemList',
        '@id': `${listUrl}#itemlist`,
        name: `${section.label} articles`,
        numberOfItems: posts.length,
        itemListElement,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${listUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: home,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: section.label,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

/** Article breadcrumb: Home → Section → Story */
export function buildArticleBreadcrumbJsonLd(post: {
  title: string;
  category: string | null;
  slug: string;
  isPremium?: boolean;
  printEditionId?: string | null;
}) {
  const home = siteOrigin();
  const sectionSlug =
    post.category && getSection(post.category) ? post.category : 'news';
  const section = getSection(sectionSlug)!;
  const articleUrl = `${home}${getArticleUrl(post)}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: home,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: section.label,
        item: `${home}${getSectionPath(sectionSlug)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  };
}
