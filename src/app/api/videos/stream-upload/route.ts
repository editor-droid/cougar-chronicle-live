import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Creates a Cloudflare Stream direct-upload session.
 *
 * - protocol: "basic" → JSON { uploadURL, uid } (files under 200MB only)
 * - protocol: "tus" (default) → resumable; required for large phone videos
 *   Returns { uploadURL, uid } for tus-js-client `uploadUrl`
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
            'Cloudflare Stream is not configured. Add CLOUDFLARE_API_TOKEN (Stream:Edit) to Railway/.env.',
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const protocol = body.protocol === 'basic' ? 'basic' : 'tus';
    // Phone videos can be long; reserve up to 30 min (actual billed duration is shorter after process)
    const maxDurationSeconds = Math.min(
      Math.max(Number(body.maxDurationSeconds) || 1800, 60),
      3600
    );
    const name = String(body.name || 'Cougar Chronicle upload').slice(0, 200);

    if (protocol === 'basic') {
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
            meta: { name },
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
        protocol: 'basic',
        uploadURL: data.result.uploadURL,
        uid: data.result.uid,
      });
    }

    // ── TUS (resumable, large files) ──────────────────────────────────────
    const uploadLength = Number(body.uploadLength);
    if (!Number.isFinite(uploadLength) || uploadLength <= 0) {
      return NextResponse.json(
        { error: 'uploadLength (file size in bytes) is required for TUS uploads' },
        { status: 400 }
      );
    }

    // Soft cap ~4GB — far above typical phone clips; protects mis-taps
    const MAX_BYTES = 4 * 1024 * 1024 * 1024;
    if (uploadLength > MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            'File is larger than 4 GB. Trim or export at a lower resolution (1080p is fine for social highlights).',
        },
        { status: 400 }
      );
    }

    const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
    const uploadMetadata = [
      `maxDurationSeconds ${b64(String(maxDurationSeconds))}`,
      `name ${b64(name)}`,
    ].join(',');

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(uploadLength),
          'Upload-Metadata': uploadMetadata,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Stream TUS create failed', res.status, errText);
      return NextResponse.json(
        { error: 'Failed to start resumable upload with Cloudflare Stream' },
        { status: 502 }
      );
    }

    const uploadURL = res.headers.get('Location');
    if (!uploadURL) {
      return NextResponse.json(
        { error: 'Stream did not return an upload Location' },
        { status: 502 }
      );
    }

    // Prefer stream-media-id header; fall back to parsing URL
    let uid =
      res.headers.get('stream-media-id') ||
      res.headers.get('Stream-Media-Id') ||
      '';
    if (!uid) {
      const m = uploadURL.match(/\/([a-f0-9]{32})(?:\?|$)/i) || uploadURL.match(/\/([a-zA-Z0-9_-]{16,})(?:\?|$)/);
      uid = m?.[1] || '';
    }

    if (!uid) {
      console.error('Could not parse Stream uid from', uploadURL);
      return NextResponse.json(
        { error: 'Could not determine Stream video id from upload URL' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      protocol: 'tus',
      uploadURL,
      uid,
    });
  } catch (error) {
    console.error('stream-upload error', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Upload setup failed' },
      { status: 500 }
    );
  }
}
