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

/**
 * Minimal profanity filter — only blocks extreme hate speech / slurs.
 * Common swear words are allowed. We start with an empty list and add
 * only the words we explicitly want to block.
 */
const BLOCKED_TERMS = [
  // Racial slurs — only the most severe terms
  'nigger', 'nigga', 'chink', 'spic', 'kike', 'gook', 'wetback', 'towelhead', 'raghead', 'beaner',
  'coon', 'jigaboo', 'porch monkey', 'spook', 'zipperhead',
  // Homophobic / transphobic slurs
  'faggot', 'fag', 'dyke', 'tranny', 'shemale',
  // Religious hate speech
  'jihad', 'sandnigger',
  // Ableist slurs
  'retard', 'retarded',
];

const filter = new (Filter as any)({ emptyList: true });
filter.addWords(...BLOCKED_TERMS);

/**
 * Shared profanity filter instance.
 * Only blocks extreme slurs — common swear words are allowed through.
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
