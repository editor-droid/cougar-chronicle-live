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
