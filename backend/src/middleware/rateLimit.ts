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

interface MemoryLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function memoryLimit(scope: string, max: number, windowMs: number, userId: string): MemoryLimitResult {
  if (!memoryLimiters.has(scope)) {
    memoryLimiters.set(scope, new Map());
  }

  const store = memoryLimiters.get(scope)!;
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now >= entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
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
          const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
          res.status(429).json({
            code: 'RATE_LIMITED',
            error: `You are doing that too fast. Try again in ${retryAfterSeconds} second${retryAfterSeconds !== 1 ? 's' : ''}.`,
            retryAfterSeconds,
          });
          return;
        }
      } else {
        const result = memoryLimit(scope, max, windowMs, userId);
        if (!result.allowed) {
          res.status(429).json({
            code: 'RATE_LIMITED',
            error: `You are doing that too fast. Try again in ${result.retryAfterSeconds} second${result.retryAfterSeconds !== 1 ? 's' : ''}.`,
            retryAfterSeconds: result.retryAfterSeconds,
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
