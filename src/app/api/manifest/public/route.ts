import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "The Cougar Chronicle",
    short_name: "Chronicle",
    description: "National-grade news platform for the BYU community. Faith, News, and Opinion.",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "portrait-primary",
    // Splash / launch shell color — must match brand navy for instant blue open
    background_color: "#1B2253",
    theme_color: "#1B2253",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };

  return NextResponse.json(manifest);
}
