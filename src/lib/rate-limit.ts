type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Lazy sweep of expired buckets so memory doesn't grow unbounded across
// many distinct guest IPs over a long-running process. Not on a timer --
// piggybacks on whichever request happens to trigger it, which is enough
// at this app's traffic scale.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** In-memory, per-process fixed-window rate limiter. Fine for this app's
 * current single-instance deployment; if it ever runs across multiple
 * instances (horizontal scaling), this needs to move to a shared store
 * (Postgres or Redis) since each instance would otherwise track its own
 * separate count and the effective limit would multiply per instance. */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return request.headers.get("x-real-ip") ?? "unknown";
}
