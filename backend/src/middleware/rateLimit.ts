import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Create a per-user rate limiter for a specific scope.
 * Persistent in-memory on a long-running Express process (unlike serverless).
 *
 * @param scope  - Namespace for this limiter (e.g., 'messages', 'general')
 * @param max    - Max requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(scope: string, max: number, windowMs: number = 60_000) {
  if (!limiters.has(scope)) {
    limiters.set(scope, new Map());
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.userId;
    if (!userId) {
      next();
      return;
    }

    const store = limiters.get(scope)!;
    const now = Date.now();
    const entry = store.get(userId);

    if (!entry || now >= entry.resetAt) {
      store.set(userId, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.status(429).json({ error: `Rate limit exceeded (${max} per ${windowMs / 1000}s)` });
      return;
    }

    entry.count++;
    next();
  };
}

// ─── H1 Fix: Periodic cleanup of expired rate limit entries ───
// Prevents unbounded memory growth from one-time users
setInterval(() => {
  const now = Date.now();
  for (const [, store] of limiters) {
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }
}, 60_000); // Sweep every 60 seconds
