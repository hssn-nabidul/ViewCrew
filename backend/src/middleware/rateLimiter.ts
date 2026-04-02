interface RateLimitConfig {
  maxEvents: number;
  windowMs: number;
  blockMs?: number;
}

interface ClientBucket {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

export class SocketRateLimiter {
  private buckets = new Map<string, ClientBucket>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  allow(socketId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let bucket = this.buckets.get(socketId);

    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + this.config.windowMs,
      };
      this.buckets.set(socketId, bucket);
    }

    if (bucket.blockedUntil && now < bucket.blockedUntil) {
      return { allowed: false, retryAfter: bucket.blockedUntil - now };
    }

    if (bucket.blockedUntil && now >= bucket.blockedUntil) {
      bucket.blockedUntil = undefined;
      bucket.count = 0;
    }

    bucket.count++;

    if (bucket.count > this.config.maxEvents) {
      const blockMs = this.config.blockMs || this.config.windowMs;
      bucket.blockedUntil = now + blockMs;
      return { allowed: false, retryAfter: blockMs };
    }

    return { allowed: true };
  }

  reset(socketId: string): void {
    this.buckets.delete(socketId);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, bucket] of this.buckets) {
      if (bucket.resetAt < now && (!bucket.blockedUntil || bucket.blockedUntil < now)) {
        this.buckets.delete(id);
      }
    }
  }
}

export function createRateLimiter(config: RateLimitConfig): SocketRateLimiter {
  return new SocketRateLimiter(config);
}
