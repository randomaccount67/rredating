import type { Region, Rank, Role, MusicTag } from './constants';

export interface Profile {
  id: string;
  auth_user_id: string;
  gender: string | null;
  riot_id: string | null;
  riot_tag: string | null;
  region: Region | null;
  peak_rank: Rank | null;
  current_rank: Rank | null;
  role: Role | null;
  agents: string[] | null;
  mic_on: boolean;
  avg_acs: number | null;
  reports_this_act: number;
  music_tags: MusicTag[] | null;
  favorite_artist: string | null;
  about: string | null;
  avatar_url: string | null;
  confirmed_18: boolean;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
  is_admin: boolean;
  is_banned: boolean;
  age: number | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  reviewed: boolean;
  created_at: string;
}

export interface MatchRequest {
  id: string;
  from_user: string;
  to_user: string;
  status: 'pending' | 'matched' | 'declined';
  created_at: string;
}

export interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}
