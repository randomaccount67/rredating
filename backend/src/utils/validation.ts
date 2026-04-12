import { z } from 'zod';
import { AGENTS, MUSIC_TAGS, RANKS, REGIONS, ROLES } from '../types/index.js';

// ─── Shared Validators ────────────────────────────────────────

/** UUID v4 format validator — used for all ID parameters */
export const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid ID format',
);

// ─── Profile Schemas ──────────────────────────────────────────

const riotIdField = z.string().max(24, 'Riot ID too long').nullable().optional();
const riotTagField = z.string().max(20, 'Riot tag too long').nullable().optional();
const aboutField = z.string().max(500, 'About too long').nullable().optional();
const favoriteArtistField = z.string().max(80, 'Artist name too long').nullable().optional();
const genderField = z.string().max(30, 'Gender too long').nullable().optional();
const avatarUrlField = z.string().url('Invalid avatar URL').max(500).nullable().optional();

const regionField = z.enum(REGIONS as unknown as [string, ...string[]]).nullable().optional();
const roleField = z.enum(ROLES as unknown as [string, ...string[]]).nullable().optional();
const rankField = z.enum(RANKS as unknown as [string, ...string[]]).nullable().optional();
const agentsField = z.array(z.enum(AGENTS as unknown as [string, ...string[]])).max(5).nullable().optional();
const musicTagsField = z.array(z.enum(MUSIC_TAGS as unknown as [string, ...string[]])).max(8).nullable().optional();

/** Schema for POST /api/profile (profile creation) */
export const createProfileSchema = z.object({
  confirmed_18: z.literal(true, { error: 'You must confirm you are 18+.' }),
  age: z.number().int().min(18, 'Must be 18+').max(99, 'Invalid age'),
  riot_id: riotIdField,
  riot_tag: riotTagField,
  region: regionField,
  peak_rank: rankField,
  current_rank: rankField,
  role: roleField,
  agents: agentsField,
  mic_on: z.boolean().optional(),
  gender: genderField,
  music_tags: musicTagsField,
  favorite_artist: favoriteArtistField,
  about: aboutField,
  avatar_url: avatarUrlField,
}).strict(); // Reject unknown fields entirely

/** Schema for PUT /api/profile (profile update) */
export const updateProfileSchema = z.object({
  riot_id: riotIdField,
  riot_tag: riotTagField,
  region: regionField,
  peak_rank: rankField,
  current_rank: rankField,
  role: roleField,
  agents: agentsField,
  mic_on: z.boolean().optional(),
  gender: genderField,
  music_tags: musicTagsField,
  favorite_artist: favoriteArtistField,
  about: aboutField,
  avatar_url: avatarUrlField,
  age: z.number().int().min(18).max(99).optional(),
}).strict();

// ─── Privileged Field Stripping ───────────────────────────────

/** Fields that must NEVER be set by a user request */
const PRIVILEGED_FIELDS = [
  'id', 'auth_user_id', 'email_hash',
  'is_admin', 'is_banned',
  'reports_this_act', 'created_at',
] as const;

/**
 * Strip privileged fields from any request body.
 * Defense-in-depth — even if validation schemas miss something,
 * these fields can never be set by user input.
 */
export function stripPrivilegedFields(body: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...body };
  for (const field of PRIVILEGED_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}
