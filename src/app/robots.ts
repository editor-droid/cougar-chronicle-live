import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Premium/print HTML teasers are indexable (paywall body). Block staff tools only.
      disallow: ['/dashboard/', '/login', '/account', '/api/', '/restore-purchases'],
    },
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
  };
}
