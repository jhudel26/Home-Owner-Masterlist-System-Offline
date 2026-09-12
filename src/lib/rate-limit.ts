interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((val, key) => {
      if (val.resetAt < now) {
        memoryStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit?: number; // Max allowed requests
  windowMs?: number; // Window duration in ms
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds?: number;
}

export function rateLimit(identifier: string, options: RateLimitOptions = {}): RateLimitResult {
  const limit = options.limit ?? 20; // Default 20 requests
  const windowMs = options.windowMs ?? 60 * 1000; // Default 1 minute
  const now = Date.now();

  const record = memoryStore.get(identifier);

  if (!record || record.resetAt < now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryStore.set(identifier, newRecord);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(newRecord.resetAt / 1000),
    };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: Math.ceil(record.resetAt / 1000),
      retryAfterSeconds,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil(record.resetAt / 1000),
  };
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
