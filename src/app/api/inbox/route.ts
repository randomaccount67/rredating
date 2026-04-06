import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ items: [], my_profile_id: null });

  // Run all independent top-level queries in parallel
  const [
    { data: incomingRequests },
    { data: conversations },
    { data: unreadNotifs },
  ] = await Promise.all([
    supabase
      .from('match_requests')
      .select('id, from_user, status, created_at, profiles!match_requests_from_user_fkey(id, riot_id, riot_tag, avatar_url, current_rank)')
      .eq('to_user', myProfile.id)
      .neq('status', 'declined')
      .order('created_at', { ascending: false }),
    supabase
      .from('conversations')
      .select('id, user_a, user_b, created_at')
      .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('notifications')
      .select('related_user')
      .eq('user_id', myProfile.id)
      .eq('type', 'new_message')
      .eq('read', false),
  ]);

  // Unread count map: sender_profile_id -> count
  const unreadByUser: Record<string, number> = {};
  for (const notif of unreadNotifs ?? []) {
    const uid = notif.related_user as string;
    unreadByUser[uid] = (unreadByUser[uid] ?? 0) + 1;
  }

  const items = [];

  // Build request items
  for (const req of incomingRequests ?? []) {
    const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
    items.push({
      id: req.id,
      type: 'match_request' as const,
      user: profile,
      status: req.status,
      created_at: req.created_at,
    });
  }

  // Batch-fetch conversation data — one profile query + parallel last-message queries
  const convList = conversations ?? [];
  if (convList.length > 0) {
    const otherUserIds = convList.map(c => c.user_a === myProfile.id ? c.user_b : c.user_a);
    const convIds = convList.map(c => c.id);

    // Fire all data fetches in parallel: profiles (one batch) + last message per conversation
    const [{ data: otherProfiles }, lastMsgResults] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, riot_id, riot_tag, avatar_url, current_rank')
        .in('id', otherUserIds),
      Promise.all(
        convIds.map(id =>
          supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        )
      ),
    ]);

    const profileById = Object.fromEntries((otherProfiles ?? []).map(p => [p.id, p]));

    // Build conversation items, deduplicating by other user (convList is newest-first)
    const seenOtherUsers = new Set<string>();
    const convItems = [];

    for (let i = 0; i < convList.length; i++) {
      const conv = convList[i];
      const otherUserId = conv.user_a === myProfile.id ? conv.user_b : conv.user_a;

      // Deduplicate: if multiple conversations with same user, keep the most recent
      if (seenOtherUsers.has(otherUserId)) continue;
      seenOtherUsers.add(otherUserId);

      const lastMsg = lastMsgResults[i]?.data;
      convItems.push({
        id: conv.id,
        type: 'conversation' as const,
        user: profileById[otherUserId] ?? null,
        last_message: lastMsg?.content ?? null,
        last_message_at: lastMsg?.created_at ?? conv.created_at,
        unread: unreadByUser[otherUserId] ?? 0,
        conversation_id: conv.id,
        created_at: conv.created_at,
      });
    }

    // Sort by most recent message first
    convItems.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    items.push(...convItems);
  }

  return NextResponse.json({ items, my_profile_id: myProfile.id });
}
