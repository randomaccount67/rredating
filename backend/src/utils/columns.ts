/**
 * Shared Supabase column select strings.
 * Prevents drift between services that query the same shape.
 */

/** Public-facing profile fields returned to the frontend. */
export const PROFILE_PUBLIC_COLUMNS =
  'id, riot_id, riot_tag, avatar_url, current_rank, peak_rank, role, agents, music_tags, about, gender, region, favorite_artist, is_online, created_at, age';

/** Browse page columns (same shape but used in match filtering context). */
export const BROWSE_COLUMNS =
  'id, riot_id, riot_tag, region, current_rank, peak_rank, role, agents, about, avatar_url, music_tags, favorite_artist, gender, is_online, created_at, age, mic_on';

/** Admin user list columns (includes moderation fields). */
export const ADMIN_USER_COLUMNS =
  'id, riot_id, riot_tag, region, created_at, is_banned, is_admin, avatar_url, about, agents, peak_rank, current_rank, role, gender, favorite_artist, music_tags';
