interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitInfo>();

function pruneExpired(now: number) {
  for (const [key, info] of rateLimits) {
    if (now >= info.resetTime) rateLimits.delete(key);
  }
}

export function rateLimitKeyCount(): number {
  return rateLimits.size;
}

export function rateLimit(ip: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  pruneExpired(now);
  const info = rateLimits.get(ip);

  if (!info) {
    const reset = now + windowMs;
    rateLimits.set(ip, {
      count: 1,
      resetTime: reset,
    });
    return { success: true, limit, remaining: limit - 1, reset };
  }

  if (now > info.resetTime) {
    info.count = 1;
    info.resetTime = now + windowMs;
    return { success: true, limit, remaining: limit - 1, reset: info.resetTime };
  }

  info.count += 1;
  const remaining = Math.max(0, limit - info.count);
  
  return { 
    success: info.count <= limit, 
    limit, 
    remaining, 
    reset: info.resetTime 
  };
}

type HeaderSource = {
  headers?: { get(name: string): string | null } | null;
};

/**
 * Client IP behind Cloudflare.
 * `cf-connecting-ip` is set by Cloudflare and is not the spoofable first
 * X-Forwarded-For hop. Fall back to the first forwarded entry, then x-real-ip.
 */
export function getClientIp(request: HeaderSource | null | undefined): string {
  const headers = request?.headers;
  if (!headers?.get) return 'unknown';

  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;

  return 'unknown';
}
