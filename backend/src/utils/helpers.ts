import crypto from 'crypto';
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
 * Minimal profanity filter using regex — only blocks extreme slurs and hate speech.
 * Common swear words (fuck, shit, ass, damn, bitch, crap, hell, etc.) are allowed through.
 */
const SLUR_PATTERN = new RegExp(
  '\\b(' + [
    // Racial slurs
    'nigger', 'niggers', 'nigga', 'nigg[ae]r', 'chink', 'chinks', 'spic', 'spics',
    'kike', 'kikes', 'gook', 'gooks', 'wetback', 'wetbacks', 'towelhead', 'towelheads',
    'raghead', 'ragheads', 'beaner', 'beaners', 'coon', 'coons', 'jigaboo', 'jigaboos',
    'zipperhead', 'zipperheads', 'porch\\s*monkey',
    // Homophobic / transphobic slurs
    'faggot', 'faggots', 'tranny', 'trannies', 'shemale', 'shemales',
    // Compound slurs
    'sandnigger', 'sandniggers',
  ].join('|') + ')\\b',
  'gi',
);

export function cleanProfanity(text: string): string {
  return text.replace(SLUR_PATTERN, '***');
}

export function hasProfanity(text: string): boolean {
  return SLUR_PATTERN.test(text);
}
