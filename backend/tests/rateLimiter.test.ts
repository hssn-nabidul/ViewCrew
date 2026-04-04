import { describe, it, expect, beforeEach } from 'vitest';
import { createRateLimiter, SocketRateLimiter } from '../src/middleware/rateLimiter';

describe('SocketRateLimiter', () => {
  let limiter: SocketRateLimiter;

  beforeEach(() => {
    limiter = createRateLimiter({ maxEvents: 5, windowMs: 1000 });
  });

  it('allows requests within the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.allow('socket-1');
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.allow('socket-1');
    }
    const result = limiter.allow('socket-1');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter! > 0).toBe(true);
  });

  it('resets count after window expires', async () => {
    limiter = createRateLimiter({ maxEvents: 2, windowMs: 50 });

    limiter.allow('socket-1');
    limiter.allow('socket-1');

    // Should be blocked
    expect(limiter.allow('socket-1').allowed).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 60));

    // Should be allowed again
    expect(limiter.allow('socket-1').allowed).toBe(true);
  });

  it('tracks different sockets independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.allow('socket-1');
    }

    // socket-1 should be blocked
    expect(limiter.allow('socket-1').allowed).toBe(false);

    // socket-2 should still be allowed
    expect(limiter.allow('socket-2').allowed).toBe(true);
  });

  it('reset removes all rate limit data for a socket', () => {
    for (let i = 0; i < 5; i++) {
      limiter.allow('socket-1');
    }

    expect(limiter.allow('socket-1').allowed).toBe(false);

    limiter.reset('socket-1');

    expect(limiter.allow('socket-1').allowed).toBe(true);
  });

  it('cleanup removes expired buckets', async () => {
    limiter = createRateLimiter({ maxEvents: 5, windowMs: 50, blockMs: 50 });

    // Fill up and block
    for (let i = 0; i < 5; i++) {
      limiter.allow('socket-1');
    }
    limiter.allow('socket-1'); // This should create a blocked bucket

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 100));

    limiter.cleanup();

    // After cleanup, the socket should have no data and be allowed again
    expect(limiter.allow('socket-1').allowed).toBe(true);
  });
});

describe('RateLimiter with block', () => {
  it('blocks for configured blockMs duration', () => {
    const limiter = createRateLimiter({ maxEvents: 2, windowMs: 1000, blockMs: 500 });

    limiter.allow('socket-1');
    limiter.allow('socket-1');

    const blocked = limiter.allow('socket-1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeDefined();
    expect(blocked.retryAfter! > 0).toBe(true);
  });
});
