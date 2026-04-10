import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { config } from '../config.js';
import { securityLog } from '../utils/logger.js';

// JWKS endpoint for local JWT verification — jose caches keys automatically
const JWKS = createRemoteJWKSet(
  new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`)
);

// Issuer claim must match our Supabase project
const EXPECTED_ISSUER = `${config.supabaseUrl}/auth/v1`;

// Extends Express Request with auth fields set by middleware
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      profile?: import('../types/index.js').Profile;
    }
  }
}

/**
 * Verify Supabase Auth JWT locally via JWKS (no network round-trip per request).
 * jose caches the JWKS keys and only re-fetches on key rotation.
 * Sets req.userId (Supabase Auth UUID) and req.userEmail.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    securityLog.authFailed(req.ip || 'unknown', req.path, 'missing_token');
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }

  const token = header.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: EXPECTED_ISSUER,
      audience: 'authenticated',
    });

    if (!payload.sub) {
      securityLog.authFailed(req.ip || 'unknown', req.path, 'missing_sub');
      res.status(401).json({ error: 'Invalid auth token' });
      return;
    }

    req.userId = payload.sub;
    req.userEmail = (payload.email as string) ?? undefined;
    next();
  } catch {
    securityLog.authFailed(req.ip || 'unknown', req.path, 'jwt_verification_failed');
    res.status(401).json({ error: 'Invalid auth token' });
  }
}

/**
 * Guard that requires req.profile.is_admin === true.
 * Must be placed after resolveProfile in the middleware chain.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.profile?.is_admin) {
    securityLog.authFailed(req.ip || 'unknown', req.path, 'admin_required');
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
