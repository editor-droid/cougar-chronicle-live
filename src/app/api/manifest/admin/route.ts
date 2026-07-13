import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "Chronicle Admin",
    short_name: "Chronicle Admin",
    description: "Admin Dashboard for The Cougar Chronicle",
    start_url: "/dashboard/videos",
    scope: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1B2253",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  return NextResponse.json(manifest);
}
