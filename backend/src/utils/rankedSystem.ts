import { db } from '../services/db.js';

export const RR_GAINS: Record<string, number> = {
  brilliant: 20,
  great: 10,
  best: 15,
  good: 5,
  book: 0,
  inaccuracy: -5,
  mistake: -10,
  miss: -15,
  blunder: -20,
};

export function getRankFromRR(rr: number): string {
  const r = Math.max(0, rr);
  if (r >= 2400) return 'Radiant';
  if (r >= 2300) return 'Immortal 3';
  if (r >= 2200) return 'Immortal 2';
  if (r >= 2100) return 'Immortal 1';
  if (r >= 2000) return 'Ascendant 3';
  if (r >= 1900) return 'Ascendant 2';
  if (r >= 1800) return 'Ascendant 1';
  if (r >= 1700) return 'Diamond 3';
  if (r >= 1600) return 'Diamond 2';
  if (r >= 1500) return 'Diamond 1';
  if (r >= 1400) return 'Platinum 3';
  if (r >= 1300) return 'Platinum 2';
  if (r >= 1200) return 'Platinum 1';
  if (r >= 1100) return 'Gold 3';
  if (r >= 1000) return 'Gold 2';
  if (r >= 900) return 'Gold 1';
  if (r >= 800) return 'Silver 3';
  if (r >= 700) return 'Silver 2';
  if (r >= 600) return 'Silver 1';
  if (r >= 500) return 'Bronze 3';
  if (r >= 400) return 'Bronze 2';
  if (r >= 300) return 'Bronze 1';
  if (r >= 200) return 'Iron 3';
  if (r >= 100) return 'Iron 2';
  return 'Iron 1';
}

export async function getConsecutiveCount(
  conversationId: string,
  senderId: string,
  currentMessageId: string,
): Promise<number> {
  const { data: recentMessages } = await db
    .from('messages')
    .select('sender_id')
    .eq('conversation_id', conversationId)
    .neq('id', currentMessageId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentMessages) return 0;

  let count = 0;
  for (const msg of recentMessages as Array<{ sender_id: string }>) {
    if (msg.sender_id === senderId) {
      count++;
    } else {
      break;
    }
  }
  return count;
}
