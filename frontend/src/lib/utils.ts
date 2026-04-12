import { Profile } from '@/types';

/**
 * Partial user data returned by inbox/messages endpoints.
 * Maps to a full Profile with sensible defaults for display purposes.
 */
export interface PartialProfile {
  id: string;
  riot_id: string | null;
  riot_tag: string | null;
  avatar_url: string | null;
  current_rank: string | null;
  peak_rank?: string | null;
  role?: string | null;
  agents?: string[] | null;
  music_tags?: string[] | null;
  about?: string | null;
  gender?: string | null;
  region?: string | null;
  favorite_artist?: string | null;
  is_online?: boolean;
  is_verified?: boolean;
  created_at?: string;
  age?: number | null;
}

/**
 * Convert a partial user object from the API into a full Profile for display.
 * Fills in sensible defaults for fields not returned by the endpoint.
 */
export function buildProfile(u: PartialProfile): Profile {
  return {
    id: u.id,
    riot_id: u.riot_id,
    riot_tag: u.riot_tag,
    avatar_url: u.avatar_url,
    current_rank: u.current_rank as Profile['current_rank'],
    peak_rank: (u.peak_rank ?? null) as Profile['peak_rank'],
    role: (u.role ?? null) as Profile['role'],
    agents: u.agents ?? null,
    music_tags: (u.music_tags ?? null) as Profile['music_tags'],
    about: u.about ?? null,
    gender: u.gender ?? null,
    region: (u.region ?? null) as Profile['region'],
    favorite_artist: u.favorite_artist ?? null,
    is_online: u.is_online ?? false,
    created_at: u.created_at ?? new Date().toISOString(),
    age: u.age ?? null,
    auth_user_id: '',
    mic_on: false,
    avg_acs: null,
    reports_this_act: 0,
    confirmed_18: true,
    last_seen: null,
    is_admin: false,
    is_banned: false,
    is_verified: u.is_verified ?? false,
  };
}
