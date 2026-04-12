import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

// ─── Upstash-backed limiter ────────────────────────────────────

let upstashReady = false;

// Lazily-resolved Upstash dependencies — only imported when env vars are present
// so the server starts cleanly without them in development.
type UpstashRatelimit = import('@upstash/ratelimit').Ratelimit;
const upstashLimiters = new Map<string, UpstashRatelimit>();

async function getUpstashLimiter(scope: string, max: number, windowMs: number): Promise<UpstashRatelimit> {
  if (upstashLimiters.has(scope)) return upstashLimiters.get(scope)!;

  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');

  const redis = new Redis({
    url: config.upstashRedisUrl!,
    token: config.upstashRedisToken!,
  });

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowMs}ms`),
    prefix: `rrl:${scope}`,
    analytics: false,
  });

  upstashLimiters.set(scope, limiter);
  return limiter;
}

// ─── In-memory fallback ────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryLimiters = new Map<string, Map<string, RateLimitEntry>>();

function memoryLimit(scope: string, max: number, windowMs: number, userId: string): boolean {
  if (!memoryLimiters.has(scope)) {
    memoryLimiters.set(scope, new Map());
  }

  const store = memoryLimiters.get(scope)!;
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now >= entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= max) return false; // blocked

  entry.count++;
  return true; // allowed
}

// Periodic sweep — prevents unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [, store] of memoryLimiters) {
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }
}, 60_000);

// ─── Public middleware factory ─────────────────────────────────

/**
 * Per-user rate limiter. Uses Upstash Redis when UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN are set; falls back to in-process memory otherwise.
 *
 * @param scope    - Namespace (e.g. 'messages', 'browse')
 * @param max      - Max requests per window
 * @param windowMs - Window size in milliseconds
 */
export function rateLimit(scope: string, max: number, windowMs: number = 60_000) {
  // Determine once at startup whether Upstash is configured
  if (config.upstashRedisUrl && config.upstashRedisToken) {
    upstashReady = true;
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      next();
      return;
    }

    try {
      if (upstashReady) {
        const limiter = await getUpstashLimiter(scope, max, windowMs);
        const { success, limit, remaining, reset } = await limiter.limit(userId);

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', reset);

        if (!success) {
          res.status(429).json({
            error: `Rate limit exceeded. Max ${max} requests per ${windowMs / 1000}s.`,
          });
          return;
        }
      } else {
        const allowed = memoryLimit(scope, max, windowMs, userId);
        if (!allowed) {
          res.status(429).json({
            error: `Rate limit exceeded. Max ${max} requests per ${windowMs / 1000}s.`,
          });
          return;
        }
      }

      next();
    } catch (err) {
      // If Redis goes down, fail open — never block legitimate traffic
      console.error(`[rateLimit:${scope}] Redis error, failing open:`, err);
      next();
    }
  };
}
