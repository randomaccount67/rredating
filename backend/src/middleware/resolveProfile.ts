import { Request, Response, NextFunction } from 'express';
import { db } from '../services/db.js';
import { hashEmail } from '../utils/helpers.js';

/**
 * Resolve the Supabase profile from req.userId (Supabase Auth UUID).
 * Handles email-hash re-linking for account recovery.
 * Sets req.profile or falls through for routes that handle missing profiles.
 */
export async function resolveProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Try direct lookup by auth_user_id
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('auth_user_id', req.userId)
    .single();

  if (profile) {
    req.profile = profile;
    next();
    return;
  }

  // Try email-hash re-linking (account recovery across auth providers)
  if (req.userEmail) {
    try {
      const hash = hashEmail(req.userEmail);
      const { data: linked } = await db
        .from('profiles')
        .select('*')
        .eq('email_hash', hash)
        .single();

      if (linked) {
        await db
          .from('profiles')
          .update({ auth_user_id: req.userId })
          .eq('id', linked.id);
        req.profile = { ...linked, auth_user_id: req.userId };
        next();
        return;
      }
    } catch {
      // DB error — fall through to no-profile state
    }
  }

  // No profile found — some routes (like POST /profile) operate without one
  next();
}

/**
 * Stricter variant — 404s immediately if no profile exists.
 * Use for routes that absolutely require a profile (match, inbox, messages, etc.)
 */
export async function requireProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  await resolveProfile(req, res, () => {
    if (!req.profile) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    if (req.profile.is_banned) {
      res.status(403).json({ error: 'Your account has been suspended.' });
      return;
    }
    next();
  });
}

/**
 * Requires the user to have an avatar_url set.
 * Must come AFTER requireProfile in the middleware stack.
 * Returns PROFILE_INCOMPLETE so the frontend can redirect to profile setup.
 */
export function requireAvatar(req: Request, res: Response, next: NextFunction): void {
  if (!req.profile?.avatar_url) {
    res.status(403).json({
      code: 'PROFILE_INCOMPLETE',
      error: 'A profile picture is required to use this feature.',
    });
    return;
  }
  next();
}
