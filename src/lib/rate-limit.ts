interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitInfo>();

export function rateLimit(ip: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const info = rateLimits.get(ip);

  if (!info) {
    rateLimits.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
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
