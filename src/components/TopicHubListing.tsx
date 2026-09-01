import Link from 'next/link';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';

const SITE = 'The Cougar Chronicle';
const MODE = 'insensitive' as const;

export type TopicHubSlug = 'byu-roc-pass' | 'byu-cougareat' | 'byu-honor-code';

type HubConfig = {
  slug: TopicHubSlug;
  title: string;
  description: string;
  intro: [string, string];
  moreLinks: { href: string; label: string }[];
  extraWhere: Prisma.PostWhereInput;
};

function siteOrigin() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://thecougarchronicle.com'
  ).replace(/\/$/, '');
}

function termWhere(terms: string[]): Prisma.PostWhereInput {
  return {
    OR: terms.flatMap((term) => [
      { title: { contains: term, mode: MODE } },
      { slug: { contains: term, mode: MODE } },
      { seoTitle: { contains: term, mode: MODE } },
      { seoKeywords: { contains: term, mode: MODE } },
    ]),
  };
}

export const TOPIC_HUBS: Record<TopicHubSlug, HubConfig> = {
  'byu-roc-pass': {
    slug: 'byu-roc-pass',
    title: 'BYU ROC Pass',
    description:
      'ROC pass coverage from The Cougar Chronicle — independent conservative student reporting on BYU athletics tickets, prices, and seating at Brigham Young University.',
    intro: [
      'A ROC pass is how BYU students get into athletic events, and the fights over price, inventory, and seating usually surface in public. We keep those stories in one place as they are reported.',
      'Campus coverage continues in the Campus section. Related standing guides are linked below.',
    ],
    moreLinks: [
      { href: '/campus', label: 'Campus' },
      { href: '/news', label: 'News' },
    ],
    extraWhere: termWhere(['roc pass', 'roc-pass', 'roc passes']),
  },
  'byu-cougareat': {
    slug: 'byu-cougareat',
    title: 'BYU Cougareat',
    description:
      'Cougareat coverage from The Cougar Chronicle — independent conservative student reporting on the BYU food court, vendors, and campus dining at Brigham Young University.',
    intro: [
      'The Cougareat is the student food court on campus, and changes to vendors, hours, or prices belong in the news file. This page gathers our Cougareat coverage, including the Taco Bell questions that keep coming back.',
      'See Campus for the rest of student-life reporting.',
    ],
    moreLinks: [
      { href: '/campus', label: 'Campus' },
      { href: '/news', label: 'News' },
    ],
    extraWhere: termWhere(['cougareat', 'taco bell', 'cougar eat']),
  },
  'byu-honor-code': {
    slug: 'byu-honor-code',
    title: 'BYU Honor Code',
    description:
      'Honor code coverage from The Cougar Chronicle — independent conservative student reporting on policy, enforcement, and campus life at Brigham Young University.',
    intro: [
      'The honor code is the policy that still governs daily life at Brigham Young University, and we report the revisions, enforcement questions, and student reaction as they develop. This is the running list of that coverage.',
      'Related campus and news files are linked below.',
    ],
    moreLinks: [
      { href: '/campus', label: 'Campus' },
      { href: '/news', label: 'News' },
    ],
    extraWhere: termWhere(['honor code', 'honor-code']),
  },
};

const HUB_ORDER: TopicHubSlug[] = ['byu-roc-pass', 'byu-cougareat', 'byu-honor-code'];

export function buildTopicHubMetadata(slug: TopicHubSlug): Metadata {
  const hub = TOPIC_HUBS[slug];
  const path = `/${hub.slug}`;
  const absolute = `${siteOrigin()}${path}`;

  return {
    title: hub.title,
    description: hub.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${hub.title} | ${SITE}`,
      description: hub.description,
      url: absolute,
      siteName: SITE,
      locale: 'en_US',
      type: 'website',
      images: [{ url: '/default-og.png', width: 1200, height: 630, alt: SITE }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${hub.title} | ${SITE}`,
      description: hub.description,
      images: ['/default-og.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

function buildTopicHubJsonLd(
  hub: HubConfig,
  posts: { title: string; slug: string; isPremium?: boolean; printEditionId?: string | null }[]
) {
  const home = siteOrigin();
  const pageUrl = `${home}/${hub.slug}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${hub.title} | ${SITE}`,
        description: hub.description,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE,
          url: home,
        },
        about: {
          '@type': 'Thing',
          name: hub.title,
        },
        inLanguage: 'en-US',
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#itemlist`,
        name: `${hub.title} articles`,
        numberOfItems: posts.length,
        itemListElement: posts.map((post, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${home}${getArticleUrl(post)}`,
          name: post.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: home },
          { '@type': 'ListItem', position: 2, name: hub.title, item: pageUrl },
        ],
      },
    ],
  };
}

export default async function TopicHubListing({ slug }: { slug: TopicHubSlug }) {
  const hub = TOPIC_HUBS[slug];
  const posts = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      printEditionId: null,
      publishedAt: { lte: new Date() },
      ...hub.extraWhere,
    },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: { author: true },
    take: 18,
  });

  const jsonLd = buildTopicHubJsonLd(hub, posts);
  const relatedHubs = HUB_ORDER.filter((s) => s !== slug).map((s) => TOPIC_HUBS[s]);

  return (
    <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="font-sans"
        style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}
      >
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            alignItems: 'center',
          }}
        >
          <li>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li style={{ color: 'var(--foreground)', fontWeight: 600 }}>{hub.title}</li>
        </ol>
      </nav>

      <header
        style={{
          marginBottom: '1.75rem',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '1rem',
        }}
      >
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            margin: 0,
            lineHeight: 1.1,
            color: 'var(--primary)',
          }}
        >
          {hub.title}
        </h1>
        {hub.intro.map((paragraph, i) => (
          <p
            key={i}
            className="font-sans text-muted"
            style={{ margin: '0.85rem 0 0', fontSize: '1rem', lineHeight: 1.6, maxWidth: '42rem' }}
          >
            {paragraph}
          </p>
        ))}
        <p
          className="font-sans text-sm"
          style={{ margin: '1rem 0 0', color: 'var(--muted)', lineHeight: 1.6 }}
        >
          Related guides:{' '}
          {relatedHubs.map((other, i) => (
            <span key={other.slug}>
              {i > 0 ? ' · ' : null}
              <Link href={`/${other.slug}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {other.title}
              </Link>
            </span>
          ))}
          {hub.moreLinks.map((link) => (
            <span key={link.href}>
              {' · '}
              <Link href={link.href} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted font-sans">No matching stories yet. Check News and Campus for the latest reporting.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {posts.map((post) => (
            <li
              key={post.id}
              style={{
                borderBottom: '1px solid var(--border)',
                padding: '1.15rem 0',
              }}
            >
              <h2
                className="font-serif"
                style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700, lineHeight: 1.3 }}
              >
                <Link href={getArticleUrl(post)} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {post.title}
                </Link>
              </h2>
              <div className="font-sans text-sm text-muted" style={{ marginTop: '0.35rem' }}>
                By {post.customAuthor || post.author.name} &bull;{' '}
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
