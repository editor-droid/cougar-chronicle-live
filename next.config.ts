import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
        '*.railway.app'
      ],
    },
  }
};

export default nextConfig;
