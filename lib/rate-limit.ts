const windowMs = 60_000; // 1 minute
const maxRequests = 5;

const hits = new Map<string, number[]>();

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return false; // rate limited
  }

  timestamps.push(now);
  hits.set(ip, timestamps);
  return true; // allowed
}
