import { db } from './db.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import { AppError } from '../utils/errors.js';
import type { Profile } from '../types/index.js';

/**
 * Max distinct requests shown in the inbox "requests" tab. Only pending
 * requests are ever rendered there (matched ones surface as conversations
 * instead), so this also bounds how many profile joins that query does.
 */
const MAX_PENDING_REQUESTS = 200;

/**
 * Supabase/PostgREST puts .in() filter values directly in the request URL.
 * With a few hundred UUIDs that URL exceeds the ~16KB header limit and the
 * request fails outright (HeadersOverflowError) — this hit real users with
 * large conversation counts. Chunking keeps each request well under that
 * limit regardless of how many ids are passed in.
 */
const IN_FILTER_CHUNK_SIZE = 150;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function getInbox(profile: Profile) {
  // Fetch in parallel: requests, conversations, viewers, matched user IDs
  const [requestsRes, convsRes, viewersRes, matchedRes] = await Promise.all([
    // Only pending requests are ever displayed (matched ones show up as
    // conversations via matchedRes below), so there's no reason to pay for
    // a profile join on every matched request too — that was the same
    // .in()-style volume problem, just via an embedded resource instead of
    // an explicit filter list.
    db.from('match_requests')
      .select('id, from_user, status, created_at, profiles!match_requests_from_user_fkey(id, riot_id, riot_tag, avatar_url, current_rank, peak_rank, role, agents, music_tags, about, gender, region, favorite_artist, is_online, created_at, age)')
      .eq('to_user', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(MAX_PENDING_REQUESTS),
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

  // A failed query here must never silently degrade to an empty inbox —
  // surface it as a real 500 instead of masquerading as "no data".
  if (requestsRes.error) {
    console.error('[inbox.getInbox] requests query failed', profile.id, requestsRes.error);
    throw new AppError(500, `Failed to load match requests: ${requestsRes.error.message}`);
  }
  if (convsRes.error) {
    console.error('[inbox.getInbox] conversations query failed', profile.id, convsRes.error);
    throw new AppError(500, `Failed to load conversations: ${convsRes.error.message}`);
  }
  if (viewersRes.error) {
    console.error('[inbox.getInbox] viewers query failed', profile.id, viewersRes.error);
    throw new AppError(500, `Failed to load conversation viewers: ${viewersRes.error.message}`);
  }
  if (matchedRes.error) {
    console.error('[inbox.getInbox] matched query failed', profile.id, matchedRes.error);
    throw new AppError(500, `Failed to load matched requests: ${matchedRes.error.message}`);
  }

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

  const [profilesChunks, messagesChunks] = await Promise.all([
    Promise.all(
      chunk(otherUserIds, IN_FILTER_CHUNK_SIZE).map(ids =>
        db.from('profiles').select(PROFILE_PUBLIC_COLUMNS).in('id', ids),
      ),
    ),
    Promise.all(
      chunk(conversationIds, IN_FILTER_CHUNK_SIZE).map(ids =>
        db.from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false }),
      ),
    ),
  ]);

  const profilesErr = profilesChunks.find(r => r.error)?.error;
  if (profilesErr) {
    console.error('[inbox.getInbox] partner profiles query failed', profile.id, profilesErr);
    throw new AppError(500, `Failed to load conversation partners: ${profilesErr.message}`);
  }
  const messagesErr = messagesChunks.find(r => r.error)?.error;
  if (messagesErr) {
    console.error('[inbox.getInbox] messages query failed', profile.id, messagesErr);
    throw new AppError(500, `Failed to load messages: ${messagesErr.message}`);
  }

  // Index profiles by id
  const profilesById: Record<string, any> = {};
  profilesChunks.forEach(res => (res.data || []).forEach((p: any) => { profilesById[p.id] = p; }));

  // Take only the newest message per conversation across all chunks —
  // each chunk is independently sorted, so merge before taking the first
  // per conversation rather than relying on cross-chunk ordering.
  const lastMsgByConv: Record<string, any> = {};
  messagesChunks.forEach(res => (res.data || []).forEach((m: any) => {
    const existing = lastMsgByConv[m.conversation_id];
    if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
      lastMsgByConv[m.conversation_id] = m;
    }
  }));

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