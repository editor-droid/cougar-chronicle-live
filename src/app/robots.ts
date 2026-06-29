import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/premium-article/',
        '/print-edition/',
        '/dashboard/',
        '/login',
        '/api/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
