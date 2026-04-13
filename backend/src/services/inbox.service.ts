import { db } from './db.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import type { Profile } from '../types/index.js';

export async function getInbox(profile: Profile) {
  // Fetch in parallel: requests, conversations, viewers, matched user IDs
  const [requestsRes, convsRes, viewersRes, matchedRes] = await Promise.all([
    db.from('match_requests')
      .select('id, from_user, status, created_at, profiles!match_requests_from_user_fkey(id, riot_id, riot_tag, avatar_url, current_rank, peak_rank, role, agents, music_tags, about, gender, region, favorite_artist, is_online, created_at, age)')
      .eq('to_user', profile.id)
      .neq('status', 'declined')
      .order('created_at', { ascending: false }),
    db.from('conversations')
      .select('id, user_a, user_b, created_at')
      .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
      .order('created_at', { ascending: false }),
    db.from('conversation_viewers')
      .select('conversation_id, last_seen_at')
      .eq('user_id', profile.id),
    db.from('match_requests')
      .select('from_user, to_user')
      .or(`from_user.eq.${profile.id},to_user.eq.${profile.id}`)
      .eq('status', 'matched'),
  ]);

  // Build last-seen map
  const lastSeenByConv: Record<string, string> = {};
  viewersRes.data?.forEach(v => { lastSeenByConv[v.conversation_id] = v.last_seen_at; });

  // Build request items
  const requestItems = (requestsRes.data || []).map((r: any) => ({
    id: r.id,
    type: 'match_request' as const,
    user: r.profiles,
    status: r.status,
    created_at: r.created_at,
  }));

  // Matched user set
  const matchedUserIds = new Set<string>();
  matchedRes.data?.forEach(m => {
    if (m.from_user === profile.id) matchedUserIds.add(m.to_user);
    else matchedUserIds.add(m.from_user);
  });

  // Filter conversations to matched users only
  const conversations = (convsRes.data || []).filter((conv: any) => {
    const otherId = conv.user_a === profile.id ? conv.user_b : conv.user_a;
    return matchedUserIds.has(otherId);
  });

  // BATCH FETCH: all partner profiles and all last messages in just 2 queries total
  const otherUserIds = conversations.map((c: any) =>
    c.user_a === profile.id ? c.user_b : c.user_a,
  );
  const conversationIds = conversations.map((c: any) => c.id);

  const [profilesRes, messagesRes] = await Promise.all([
    otherUserIds.length
      ? db.from('profiles').select(PROFILE_PUBLIC_COLUMNS).in('id', otherUserIds)
      : Promise.resolve({ data: [] as any[] }),
    conversationIds.length
      ? db.from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Index profiles by id
  const profilesById: Record<string, any> = {};
  (profilesRes.data || []).forEach((p: any) => { profilesById[p.id] = p; });

  // Take only the newest message per conversation from the sorted result
  const lastMsgByConv: Record<string, any> = {};
  (messagesRes.data || []).forEach((m: any) => {
    if (!lastMsgByConv[m.conversation_id]) lastMsgByConv[m.conversation_id] = m;
  });

  // Stitch everything together — zero extra queries
  const convItems = conversations.map((conv: any) => {
    const otherId = conv.user_a === profile.id ? conv.user_b : conv.user_a;
    const lastMsg = lastMsgByConv[conv.id];
    const lastSeen = lastSeenByConv[conv.id] ?? null;
    const isUnread = !!lastMsg
      && lastMsg.sender_id !== profile.id
      && (!lastSeen || new Date(lastMsg.created_at) > new Date(lastSeen));

    return {
      id: conv.id,
      type: 'conversation' as const,
      user: profilesById[otherId] ?? null,
      last_message: lastMsg?.content ?? null,
      unread: isUnread ? 1 : 0,
      created_at: lastMsg?.created_at ?? conv.created_at,
      conversation_id: conv.id,
    };
  });

  // Dedupe by partner user
  const seen = new Set<string>();
  const dedupedConvs = convItems.filter(c => {
    if (!c.user) return false;
    if (seen.has(c.user.id)) return false;
    seen.add(c.user.id);
    return true;
  });

  dedupedConvs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    items: [...requestItems, ...dedupedConvs],
    my_profile_id: profile.id,
  };
}