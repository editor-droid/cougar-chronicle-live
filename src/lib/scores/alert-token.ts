import { createHmac, timingSafeEqual } from 'node:crypto';

export const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;
/** Long enough that a link in an old alert still works. */
export const UNSUBSCRIBE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export type AlertTokenPurpose = 'confirm' | 'unsubscribe';

type TokenPayload = {
  e: string;
  p: AlertTokenPurpose;
  exp: number;
};

const SEP = '~';

export function alertTokenSecret(): string | null {
  const secret = (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '').trim();
  return secret || null;
}

function ttlMs(purpose: AlertTokenPurpose): number {
  return purpose === 'confirm' ? CONFIRM_TTL_MS : UNSUBSCRIBE_TTL_MS;
}

export function signAlertToken(
  email: string,
  purpose: AlertTokenPurpose,
  secret: string,
  now = Date.now(),
): string {
  const normalized = email.trim().toLowerCase();
  if (!secret || !normalized.includes('@')) throw new Error('Cannot sign alert token');
  const payload: TokenPayload = { e: normalized, p: purpose, exp: now + ttlMs(purpose) };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}${SEP}${sig}`;
}

function signaturesMatch(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyAlertToken(
  token: string,
  secret: string,
  purpose: AlertTokenPurpose,
  now = Date.now(),
): { ok: true; email: string } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' | 'purpose' } {
  if (!secret || typeof token !== 'string' || token.length < 20 || token.length > 2000) {
    return { ok: false, reason: 'malformed' };
  }
  const parts = token.split(SEP);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (!signaturesMatch(sig, expected)) return { ok: false, reason: 'bad-signature' };
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!payload || typeof payload.e !== 'string' || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.p !== 'confirm' && payload.p !== 'unsubscribe') return { ok: false, reason: 'malformed' };
  if (payload.exp <= now) return { ok: false, reason: 'expired' };
  if (payload.p !== purpose) return { ok: false, reason: 'purpose' };
  return { ok: true, email: payload.e };
}
