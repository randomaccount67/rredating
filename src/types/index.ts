export type Region = 'NA' | 'EU' | 'APAC' | 'LATAM' | 'BR';
export type Role = 'Duelist' | 'Controller' | 'Initiator' | 'Sentinel' | 'Flex';
export type Rank =
  | 'Iron 1' | 'Iron 2' | 'Iron 3'
  | 'Bronze 1' | 'Bronze 2' | 'Bronze 3'
  | 'Silver 1' | 'Silver 2' | 'Silver 3'
  | 'Gold 1' | 'Gold 2' | 'Gold 3'
  | 'Platinum 1' | 'Platinum 2' | 'Platinum 3'
  | 'Diamond 1' | 'Diamond 2' | 'Diamond 3'
  | 'Ascendant 1' | 'Ascendant 2' | 'Ascendant 3'
  | 'Immortal 1' | 'Immortal 2' | 'Immortal 3'
  | 'Radiant';

export type MusicTag =
  | 'Hyperpop' | 'Indie' | 'Lofi' | 'Pop'
  | 'Hip-Hop' | 'EDM' | 'Metal' | 'Other';

export interface Profile {
  id: string;
  clerk_user_id: string;
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
  // mic_on, avg_acs, reports_this_act kept in type for DB compat but not shown in UI
  music_tags: MusicTag[] | null;
  about: string | null;
  avatar_url: string | null;
  confirmed_18: boolean;
  is_online: boolean;
  last_seen: string | null;
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

export interface Notification {
  id: string;
  user_id: string;
  type: 'match_request' | 'matched' | 'new_message';
  related_user: string | null;
  read: boolean;
  created_at: string;
}

export const RANKS: Rank[] = [
  'Iron 1', 'Iron 2', 'Iron 3',
  'Bronze 1', 'Bronze 2', 'Bronze 3',
  'Silver 1', 'Silver 2', 'Silver 3',
  'Gold 1', 'Gold 2', 'Gold 3',
  'Platinum 1', 'Platinum 2', 'Platinum 3',
  'Diamond 1', 'Diamond 2', 'Diamond 3',
  'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
  'Immortal 1', 'Immortal 2', 'Immortal 3',
  'Radiant',
];

export const REGIONS: Region[] = ['NA', 'EU', 'APAC', 'LATAM', 'BR'];
export const ROLES: Role[] = ['Duelist', 'Controller', 'Initiator', 'Sentinel', 'Flex'];
export const MUSIC_TAGS: MusicTag[] = ['Hyperpop', 'Indie', 'Lofi', 'Pop', 'Hip-Hop', 'EDM', 'Metal', 'Other'];
export const AGENTS = [
  'Jett', 'Reyna', 'Phoenix', 'Yoru', 'Neon', 'Iso', 'Waylay',
  'Omen', 'Brimstone', 'Viper', 'Astra', 'Harbor', 'Clove',
  'Sova', 'Breach', 'Skye', 'Kay/O', 'Fade', 'Gekko',
  'Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse',
];

export function getRankTier(rank: string): string {
  if (rank.startsWith('Iron')) return 'iron';
  if (rank.startsWith('Bronze')) return 'bronze';
  if (rank.startsWith('Silver')) return 'silver';
  if (rank.startsWith('Gold')) return 'gold';
  if (rank.startsWith('Platinum')) return 'platinum';
  if (rank.startsWith('Diamond')) return 'diamond';
  if (rank.startsWith('Ascendant')) return 'ascendant';
  if (rank.startsWith('Immortal')) return 'immortal';
  if (rank === 'Radiant') return 'radiant';
  return 'iron';
}
