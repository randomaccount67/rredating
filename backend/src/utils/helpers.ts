import crypto from 'crypto';
import Filter from 'bad-words';
import { config } from '../config.js';

// ─── Crypto ────────────────────────────────────────────────────

/**
 * One-way hash of an email address using HMAC-SHA256.
 * Used for cross-provider account recovery (e.g., Google → Discord login).
 */
export function hashEmail(email: string): string {
  return crypto.createHmac('sha256', config.emailHmacSecret).update(email.toLowerCase().trim()).digest('hex');
}

// ─── Profanity ─────────────────────────────────────────────────

const filter = new (Filter as any)();

/**
 * Shared profanity filter instance.
 * Replaces 2× independent Filter() creations in the old codebase.
 */
export function cleanProfanity(text: string): string {
  try {
    return filter.clean(text);
  } catch {
    // bad-words can throw on non-ASCII characters
    return text;
  }
}

export function hasProfanity(text: string): boolean {
  try {
    return filter.isProfane(text);
  } catch {
    return false;
  }
}
