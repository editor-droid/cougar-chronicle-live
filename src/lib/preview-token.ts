/**
 * Signed, unguessable draft preview tokens.
 *
 * The URL token is `payload~hmac`. The database stores only sha256(token),
 * so a leaked table cannot be replayed and a row can be revoked.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const PREVIEW_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_SEPARATOR = '~';
const MAX_TOKEN_LENGTH = 4096;

export type PreviewTokenFailure =
  | 'malformed'
  | 'bad-signature'
  | 'expired'
  | 'revoked'
  | 'unknown'
  | 'mismatch';

type TokenPayload = {
  v: 1;
  postId: string;
  exp: number;
  nonce: string;
};

const POST_ID = /^[A-Za-z0-9_-]{8,80}$/;

export function previewTokenSecret(): string | null {
  const secret =
    process.env.PREVIEW_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    '';
  return secret ? secret : null;
}

export function hashPreviewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createPreviewToken(
  postId: string,
  secret: string,
  now = Date.now(),
  ttlMs = PREVIEW_TOKEN_TTL_MS
): { token: string; expiresAt: number } {
  if (!POST_ID.test(postId)) {
    throw new Error('Invalid post id');
  }
  if (!secret) throw new Error('Preview links are not configured');
  const expiresAt = now + ttlMs;
  const payload: TokenPayload = {
    v: 1,
    postId,
    exp: expiresAt,
    nonce: randomBytes(16).toString('base64url'),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return { token: `${body}${TOKEN_SEPARATOR}${sig}`, expiresAt };
}

function signaturesMatch(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyPreviewTokenSignature(
  token: string,
  secret: string,
  now = Date.now()
): { ok: true; postId: string; exp: number } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' } {
  if (!secret || typeof token !== 'string' || token.length < 16 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'malformed' };
  }
  const splitAt = token.indexOf(TOKEN_SEPARATOR);
  if (splitAt <= 0 || splitAt !== token.lastIndexOf(TOKEN_SEPARATOR)) {
    return { ok: false, reason: 'malformed' };
  }
  const body = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  if (!body || !sig) return { ok: false, reason: 'malformed' };

  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (!signaturesMatch(sig, expected)) return { ok: false, reason: 'bad-signature' };

  let payload: Partial<TokenPayload>;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<TokenPayload>;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    payload.v !== 1 ||
    typeof payload.postId !== 'string' ||
    !POST_ID.test(payload.postId) ||
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp) ||
    typeof payload.nonce !== 'string' ||
    payload.nonce.length < 8
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.exp <= now) return { ok: false, reason: 'expired' };
  return { ok: true, postId: payload.postId, exp: payload.exp };
}

export type PreviewTokenRecord = {
  tokenHash: string;
  postId: string;
  expiresAt: Date | number | string;
  revokedAt: Date | number | string | null;
};

function timeOf(value: Date | number | string): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

/**
 * Signature, expiry, stored hash, revocation, and post id must all agree.
 * A valid signature with no row is rejected, so revoked and unknown tokens
 * cannot open a draft.
 */
export function assessPreviewAccess(input: {
  token: string;
  secret: string;
  now?: number;
  record: PreviewTokenRecord | null;
}): { ok: true; postId: string } | { ok: false; reason: PreviewTokenFailure } {
  const now = input.now ?? Date.now();
  const verified = verifyPreviewTokenSignature(input.token, input.secret, now);
  if (!verified.ok) return verified;
  if (!input.record) return { ok: false, reason: 'unknown' };
  if (hashPreviewToken(input.token) !== input.record.tokenHash) {
    return { ok: false, reason: 'unknown' };
  }
  if (input.record.revokedAt != null && input.record.revokedAt !== '') {
    return { ok: false, reason: 'revoked' };
  }
  const recordExp = timeOf(input.record.expiresAt);
  if (!Number.isFinite(recordExp) || recordExp <= now) return { ok: false, reason: 'expired' };
  if (input.record.postId !== verified.postId) return { ok: false, reason: 'mismatch' };
  return { ok: true, postId: verified.postId };
}
