import { db } from './db.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import type { Profile } from '../types/index.js';

export async function getInbox(profile: Profile) {
  // Fetch in parallel: requests, conversations, unread counts, matched user IDs
  const [requestsRes, convsRes, unreadsRes, matchedRes] = await Promise.all([
    db.from('match_requests')
      .select('id, from_user, status, created_at, profiles!match_requests_from_user_fkey(id, riot_id, riot_tag, avatar_url, current_rank, peak_rank, role, agents, music_tags, about, gender, region, favorite_artist, is_online, created_at, age)')
      .eq('to_user', profile.id)
      .neq('status', 'declined')
      .order('created_at', { ascending: false }),
    db.from('conversations')
      .select('id, user_a, user_b, created_at')
      .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
      .order('created_at', { ascending: false }),
    db.from('notifications')
      .select('related_user')
      .eq('user_id', profile.id)
      .eq('type', 'new_message')
      .eq('read', false),
    db.from('match_requests')
      .select('from_user, to_user')
      .or(`from_user.eq.${profile.id},to_user.eq.${profile.id}`)
      .eq('status', 'matched'),
  ]);

  // Build unread-by-user map
  const unreadByUser: Record<string, number> = {};
  unreadsRes.data?.forEach(n => {
    if (n.related_user) {
      unreadByUser[n.related_user] = (unreadByUser[n.related_user] || 0) + 1;
    }
  });

  // Build request items
  const requestItems = (requestsRes.data || []).map((r: any) => ({
    id: r.id,
    type: 'match_request' as const,
    user: r.profiles,
    status: r.status,
    created_at: r.created_at,
  }));

  // Build set of matched user IDs to filter conversations
  const matchedUserIds = new Set<string>();
  matchedRes.data?.forEach(m => {
    if (m.from_user === profile.id) matchedUserIds.add(m.to_user);
    else matchedUserIds.add(m.from_user);
  });

  // Build conversation items with last messages + partner profiles
  const conversations = (convsRes.data || []).filter((conv: any) => {
    const otherId = conv.user_a === profile.id ? conv.user_b : conv.user_a;
    return matchedUserIds.has(otherId);
  });
  const convItems = await Promise.all(
    conversations.map(async (conv: any) => {
      const otherId = conv.user_a === profile.id ? conv.user_b : conv.user_a;

      const [profileRes, msgRes] = await Promise.all([
        db.from('profiles')
          .select(PROFILE_PUBLIC_COLUMNS)
          .eq('id', otherId)
          .single(),
        db.from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      return {
        id: conv.id,
        type: 'conversation' as const,
        user: profileRes.data,
        last_message: msgRes.data?.content ?? null,
        unread: unreadByUser[otherId] || 0,
        created_at: msgRes.data?.created_at ?? conv.created_at,
        conversation_id: conv.id,
      };
    }),
  );

  // Deduplicate conversations by other user
  const seen = new Set<string>();
  const dedupedConvs = convItems.filter(c => {
    if (!c.user) return false;
    if (seen.has(c.user.id)) return false;
    seen.add(c.user.id);
    return true;
  });

  // Sort conversations by last message time
  dedupedConvs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    items: [...requestItems, ...dedupedConvs],
    my_profile_id: profile.id,
  };
}
