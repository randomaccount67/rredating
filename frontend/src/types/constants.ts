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
  'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher',
  'Deadlock', 'Fade', 'Gekko', 'Harbor', 'Iso', 'Jett', 'KAY/O',
  'Killjoy', 'Miks', 'Neon', 'Omen', 'Phoenix', 'Raze', 'Reyna', 'Sage',
  'Skye', 'Sova', 'Tejo', 'Veto', 'Viper', 'Vyse', 'Waylay', 'Yoru',
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
