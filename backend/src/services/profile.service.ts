import { db } from './db.js';
import { cleanProfanity } from '../utils/helpers.js';
import { AppError, badRequest, notFound } from '../utils/errors.js';
import { hashEmail } from '../utils/helpers.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import { config } from '../config.js';
import { createProfileSchema, updateProfileSchema, stripPrivilegedFields } from '../utils/validation.js';

export async function getProfile(authUserId: string, email?: string) {
  const { data } = await db
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (data) return data;

  // Try email-hash re-linking
  if (email) {
    const hash = hashEmail(email);
    const { data: linked } = await db
      .from('profiles')
      .select('*')
      .eq('email_hash', hash)
      .single();
    if (linked) {
      await db.from('profiles').update({ auth_user_id: authUserId }).eq('id', linked.id);
      return { ...linked, auth_user_id: authUserId };
    }
  }

  return null;
}

export async function createProfile(authUserId: string, body: Record<string, unknown>, email?: string) {
  // C6: Strip privileged fields before anything else
  const cleaned = stripPrivilegedFields(body);

  // C4: Validate with Zod schema
  const parsed = createProfileSchema.safeParse(cleaned);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    throw badRequest(firstError.message);
  }
  const input = parsed.data;

  // Validate avatar URL hostname
  if (input.avatar_url) {
    validateAvatarUrl(input.avatar_url);
  }

  const about = typeof input.about === 'string' ? cleanProfanity(input.about) : null;
  const favoriteArtist = typeof input.favorite_artist === 'string' ? cleanProfanity(input.favorite_artist) : (input.favorite_artist ?? null);

  // Compute email hash for cross-provider linking
  let emailHash: string | null = null;
  if (email) emailHash = hashEmail(email);

  // Check if existing profile linked by email hash
  if (emailHash) {
    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('email_hash', emailHash)
      .single();
    if (existing) {
      const { data, error } = await db
        .from('profiles')
        .update({
          auth_user_id: authUserId,
          gender: input.gender ?? null,
          riot_id: input.riot_id ?? null,
          riot_tag: input.riot_tag ?? null,
          region: input.region ?? null,
          peak_rank: input.peak_rank ?? null,
          current_rank: input.current_rank ?? null,
          role: input.role ?? null,
          agents: input.agents ?? null,
          music_tags: input.music_tags ?? null,
          favorite_artist: favoriteArtist,
          about,
          avatar_url: input.avatar_url ?? null,
          confirmed_18: true,
          age: input.age,
          email_hash: emailHash,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new AppError(500, error.message);
      return data;
    }
  }

  const { data, error } = await db
    .from('profiles')
    .upsert({
      auth_user_id: authUserId,
      gender: input.gender ?? null,
      riot_id: input.riot_id ?? null,
      riot_tag: input.riot_tag ?? null,
      region: input.region ?? null,
      peak_rank: input.peak_rank ?? null,
      current_rank: input.current_rank ?? null,
      role: input.role ?? null,
      agents: input.agents ?? null,
      music_tags: input.music_tags ?? null,
      favorite_artist: favoriteArtist,
      about,
      avatar_url: input.avatar_url ?? null,
      confirmed_18: true,
      age: input.age,
      email_hash: emailHash,
    }, { onConflict: 'auth_user_id' })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  return data;
}

export async function updateProfile(authUserId: string, body: Record<string, unknown>) {
  // C6: Strip privileged fields before anything else
  const cleaned = stripPrivilegedFields(body);

  // C4: Validate with Zod schema
  const parsed = updateProfileSchema.safeParse(cleaned);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    throw badRequest(firstError.message);
  }
  const input = parsed.data;

  if (input.avatar_url) {
    validateAvatarUrl(input.avatar_url);
  }

  const about = typeof input.about === 'string' ? cleanProfanity(input.about) : null;
  const favoriteArtist = typeof input.favorite_artist === 'string' ? cleanProfanity(input.favorite_artist) : (input.favorite_artist ?? null);

  const SUPPORTER_FIELDS = ['profile_border', 'profile_border_color', 'profile_accent_color', 'profile_banner', 'username_effect', 'profile_theme', 'profile_music_url', 'profile_music_start', 'profile_music_volume'] as const;
  type SupporterField = typeof SUPPORTER_FIELDS[number];

  const hasSupporterFields = SUPPORTER_FIELDS.some(f => (input as Record<string, unknown>)[f] !== undefined);
  let isSupporter = false;
  if (hasSupporterFields) {
    const { data: cur } = await db.from('profiles').select('is_supporter').eq('auth_user_id', authUserId).single();
    isSupporter = cur?.is_supporter ?? false;
  }

  const updateData: Record<string, unknown> = {
    gender: input.gender ?? null,
    riot_id: input.riot_id ?? null,
    riot_tag: input.riot_tag ?? null,
    region: input.region ?? null,
    peak_rank: input.peak_rank ?? null,
    current_rank: input.current_rank ?? null,
    role: input.role ?? null,
    agents: input.agents ?? null,
    music_tags: input.music_tags ?? null,
    favorite_artist: favoriteArtist,
    about,
    avatar_url: input.avatar_url ?? null,
  };
  if (input.age !== undefined) updateData.age = input.age;

  // Only save supporter-only fields for supporters
  if (isSupporter) {
    for (const f of SUPPORTER_FIELDS) {
      const val = (input as Record<SupporterField, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }
  }

  const { data, error } = await db
    .from('profiles')
    .update(updateData)
    .eq('auth_user_id', authUserId)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  return data;
}

export async function getPublicProfile(profileId: string) {
  const { data, error } = await db
    .from('profiles')
    .select(PROFILE_PUBLIC_COLUMNS)
    .eq('id', profileId)
    .single();

  if (error || !data) throw notFound('Profile not found');
  return data;
}

// ─── Helpers ──────────────────────────────────────────────────

function validateAvatarUrl(url: string): void {
  try {
    const u = new URL(url);
    const supaHost = new URL(config.supabaseUrl).hostname;
    if (!u.hostname.endsWith(supaHost.replace(/^[^.]+\./, ''))) {
      throw badRequest('Invalid avatar URL.');
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw badRequest('Invalid avatar URL.');
  }
}
