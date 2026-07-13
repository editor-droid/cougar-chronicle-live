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
