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
    ];
  },
};

export default withPWA(nextConfig);
