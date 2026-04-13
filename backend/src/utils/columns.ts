/**
 * Shared Supabase column select strings.
 * Prevents drift between services that query the same shape.
 */

/** Public-facing profile fields returned to the frontend. */
export const PROFILE_PUBLIC_COLUMNS =
  'id, riot_id, riot_tag, avatar_url, current_rank, peak_rank, role, agents, music_tags, about, gender, region, favorite_artist, is_online, created_at, age, is_verified, is_supporter, supporter_since, profile_border, profile_border_color, profile_accent_color, profile_banner, username_effect, profile_theme, badges';

/** Browse page columns (same shape but used in match filtering context). */
export const BROWSE_COLUMNS =
  'id, riot_id, riot_tag, region, current_rank, peak_rank, role, agents, about, avatar_url, music_tags, favorite_artist, gender, is_online, created_at, age, mic_on, is_verified, is_supporter, profile_border, profile_border_color, profile_accent_color, profile_banner, username_effect, profile_theme';

/** Admin user list columns (includes moderation fields). */
export const ADMIN_USER_COLUMNS =
  'id, riot_id, riot_tag, region, created_at, is_banned, is_admin, is_verified, avatar_url, about, agents, peak_rank, current_rank, role, gender, favorite_artist, music_tags';
