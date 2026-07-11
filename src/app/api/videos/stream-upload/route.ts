import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Creates a one-time Cloudflare Stream direct-upload URL.
 * Requires CLOUDFLARE_API_TOKEN (Account API token with Stream:Edit)
 * and CLOUDFLARE_ACCOUNT_ID (already used for R2).
 *
 * Docs: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'EDITOR' && role !== 'WRITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        {
          error:
            'Cloudflare Stream is not configured. Add CLOUDFLARE_API_TOKEN (Stream:Edit) to Railway/.env. CLOUDFLARE_ACCOUNT_ID is already set for R2.',
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    // Short clips; reserves storage until upload completes
    const maxDurationSeconds = Math.min(
      Math.max(Number(body.maxDurationSeconds) || 180, 30),
      600
    );

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds,
          requireSignedURLs: false,
          meta: {
            name: body.name || 'Cougar Chronicle upload',
          },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      const msg =
        data?.errors?.[0]?.message ||
        data?.messages?.[0] ||
        'Failed to create Stream upload URL';
      console.error('Stream direct_upload failed', data);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    return NextResponse.json({
      uploadURL: data.result.uploadURL,
      uid: data.result.uid,
    });
  } catch (error) {
    console.error('stream-upload error', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Upload setup failed' },
      { status: 500 }
    );
  }
}
