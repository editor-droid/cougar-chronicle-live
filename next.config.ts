import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    cpus: 2,
    workerThreads: false,
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'cougar-chronicle-live-production-c994.up.railway.app',
        '*.railway.app',
        'thecougarchronicle.com',
        'www.thecougarchronicle.com'
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // fullscreen=* so Cloudflare Stream / YouTube iframes can use the Fullscreen API
            // (default is self-only — PiP works, native fullscreen does not)
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), fullscreen=*',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/join',
        destination: '/recruiting',
        permanent: true,
      },
      {
        source: '/careers',
        destination: '/recruiting',
        permanent: true,
      },
      {
        source: '/apply',
        destination: '/recruiting',
        permanent: false,
      },
      {
        source: '/applications',
        destination: '/recruiting',
        permanent: false,
      },
      {
        source: '/dashboard/site',
        destination: '/dashboard/team',
        permanent: false,
      },
      {
        source: '/dashboard/team-media',
        destination: '/dashboard/team',
        permanent: false,
      },
      // Appearances (formerly “Media”) — avoid clash with Videos
      {
        source: '/dashboard/media',
        destination: '/dashboard/appearances',
        permanent: false,
      },
      // Canonical sections: /news /opinion /campus /politics /family /faith
      // Legacy /category/* permanently redirects (see category/[slug] + these)
      {
        source: '/category/news',
        destination: '/news',
        permanent: true,
      },
      {
        source: '/category/opinion',
        destination: '/opinion',
        permanent: true,
      },
      {
        source: '/category/campus',
        destination: '/campus',
        permanent: true,
      },
      {
        source: '/category/faith',
        destination: '/faith',
        permanent: true,
      },
      {
        source: '/category/politics',
        destination: '/politics',
        permanent: true,
      },
      {
        source: '/category/family',
        destination: '/family',
        permanent: true,
      },
      {
        source: '/category/family-issues',
        destination: '/family',
        permanent: true,
      },
      {
        source: '/family-issues',
        destination: '/family',
        permanent: true,
      },
      // Free articles are flat /{slug}. Keep /article/{slug} as a permanent alias → flat.
      {
        source: '/article/:slug',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },
  /**
   * Serve free stories at /{slug} without a catch-all page fighting real routes.
   * Static paths (news, about, …) win; unknown paths fall through to the article renderer.
   */
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:slug',
          destination: '/article/:slug',
        },
      ],
    };
  },
};

export default withPWA(nextConfig);
