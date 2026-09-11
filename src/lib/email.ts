import { Resend } from 'resend';
import { rewriteMediaUrl } from './media-url';

/** Verified Resend domain — use this for every outbound message. */
export const NEWSLETTER_FROM =
  'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>';

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY || '';
  return Boolean(key) && !key.includes('placeholder') && !key.includes('fallback');
}

export function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY || 're_unconfigured');
}

export async function sendOneEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  if (!isResendConfigured()) {
    console.warn('[email] skipped (RESEND_API_KEY missing)', opts.subject);
    return { ok: false, error: 'not_configured' };
  }
  const result = await getResend().emails.send({
    from: opts.from || NEWSLETTER_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (result.error) {
    console.error('[email] send failed', opts.subject, result.error);
    return { ok: false, error: result.error.message };
  }
  return { ok: true, id: result.data?.id };
}

/** Strict-enough email check for subscribe + broadcast (blocks probes / SQL noise). */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: unknown): email is string {
  if (!email || typeof email !== 'string') return false;
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  if (!EMAIL_RE.test(e)) return false;
  // Known injection / scanner junk
  if (/sample@email\.tst/i.test(e)) return false;
  if (/(sleep\s*\(|waitfor|pg_sleep|xor\s*\(|\bunion\b|\bselect\b|\bdrop\b)/i.test(e)) return false;
  if (/['"`;]/.test(e)) return false;
  return true;
}

/**
 * Append a small, stable UTM set. Only use on share + newsletter links — not site nav.
 *
 * Share channels: native | copy | twitter | facebook | email
 * Newsletter: source=newsletter, medium=email
 *
 * Note: iMessage is not a separate web API. When the user picks Messages in the
 * OS share sheet, that uses the "native" URL (same as AirDrop / Notes / etc.).
 */
export function withUtm(
  href: string,
  params: { source: string; medium: string; campaign?: string }
): string {
  try {
    // Support absolute and relative URLs
    const base =
      href.startsWith('http://') || href.startsWith('https://')
        ? href
        : `https://thecougarchronicle.com${href.startsWith('/') ? '' : '/'}${href}`;
    const u = new URL(base);
    // Drop prior utm_* so we don't stack tags if someone re-shares a tracked link
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) =>
      u.searchParams.delete(k)
    );
    u.searchParams.set('utm_source', params.source);
    u.searchParams.set('utm_medium', params.medium);
    if (params.campaign) u.searchParams.set('utm_campaign', params.campaign);

    // If input was relative, return path + query (+ hash) only for same-origin helpers;
    // callers that need absolute (emails, share) pass absolute or we return full URL.
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return u.toString();
    }
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href;
  }
}

const PLACEHOLDER_IMAGE_RE = /\/images\/(default-article|default-og)\.(jpg|png|jpeg|webp)(\?|$)/i;

function siteOrigin(origin?: string): string {
  const raw = (origin || process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com').trim();
  return raw.replace(/\/$/, '') || 'https://thecougarchronicle.com';
}

/** Escape text interpolated into newsletter HTML. */
export function escapeEmailHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Public HTTPS URL an email client (or Gmail's image proxy) can fetch.
 * Never point at /_next/image — clients load src directly.
 */
export function absoluteEmailImageUrl(
  url: string | null | undefined,
  origin?: string
): string | null {
  if (!url || typeof url !== 'string') return null;
  let src = rewriteMediaUrl(url.trim());
  if (!src) return null;
  if (src.startsWith('data:') || src.includes('/_next/image')) return null;
  if (PLACEHOLDER_IMAGE_RE.test(src)) return null;
  if (src.startsWith('//')) src = `https:${src}`;
  if (src.startsWith('/')) src = `${siteOrigin(origin)}${src}`;
  if (src.startsWith('http://')) src = `https://${src.slice('http://'.length)}`;
  if (!/^https:\/\//i.test(src)) return null;
  if (/^https:\/\/(localhost|127\.0\.0\.1)[:/]/i.test(src)) return null;
  return src;
}

function linkedImgTag(opts: {
  src: string;
  href: string;
  alt: string;
  width: number;
}): string {
  const w = opts.width;
  return `<a href="${escapeEmailHtml(opts.href)}" style="text-decoration:none;display:block;">
      <img src="${escapeEmailHtml(opts.src)}" alt="${escapeEmailHtml(opts.alt)}" width="${w}" border="0" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;border-radius:6px;" />
    </a>`;
}

/** Full-width hero (instant post/video). Empty string if no usable image. */
export function newsletterHeroImageHtml(opts: {
  src: string | null | undefined;
  href: string;
  alt: string;
  origin?: string;
}): string {
  const src = absoluteEmailImageUrl(opts.src, opts.origin);
  if (!src) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px 0;">
      <tr>
        <td>
          ${linkedImgTag({ src, href: opts.href, alt: opts.alt, width: 600 })}
        </td>
      </tr>
    </table>`;
}

/** Digest / related-story row: optional thumb + title + meta. */
export function newsletterStoryRowHtml(opts: {
  href: string;
  title: string;
  meta?: string;
  imageSrc?: string | null;
  imageAlt?: string;
  origin?: string;
}): string {
  const src = absoluteEmailImageUrl(opts.imageSrc, opts.origin);
  const title = `<a href="${escapeEmailHtml(opts.href)}" style="color:#1B2253;font-weight:bold;font-family:Georgia,serif;font-size:17px;text-decoration:none;line-height:1.35;">${escapeEmailHtml(opts.title)}</a>`;
  const meta = opts.meta
    ? `<br/><span style="color:#6B7280;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">${escapeEmailHtml(opts.meta)}</span>`
    : '';

  if (!src) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
      <tr><td>${title}${meta}</td></tr>
    </table>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
      <tr>
        <td valign="top" width="120" style="width:120px;padding-right:14px;">
          ${linkedImgTag({ src, href: opts.href, alt: opts.imageAlt || opts.title, width: 120 })}
        </td>
        <td valign="top">${title}${meta}</td>
      </tr>
    </table>`;
}

/** Shared footer for all list emails: why you're receiving + unsubscribe + preferences. */
export function newsletterEmailFooter(origin: string, recipientEmail: string): string {
  const unsub = `${origin}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
  const prefs = `${origin}/account`;
  return `
    <hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 40px; margin-bottom: 16px;" />
    <p style="font-size: 12px; color: #999; text-align: center; line-height: 1.6; margin: 0 0 8px 0;">
      You are receiving this email because you subscribed to The Cougar Chronicle.
      This is not a transactional message — you can opt out anytime.
    </p>
    <p style="font-size: 12px; color: #999; text-align: center; line-height: 1.6; margin: 0;">
      <a href="${prefs}" style="color: #1B2253; text-decoration: underline;">Manage preferences</a>
      &nbsp;·&nbsp;
      <a href="${unsub}" style="color: #1B2253; text-decoration: underline;">Unsubscribe</a>
    </p>
  `;
}
