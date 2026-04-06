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

  if (!myProfile) return NextResponse.json({ items: [] });

  // Get incoming match requests (pending, not from me)
  const { data: incomingRequests } = await supabase
    .from('match_requests')
    .select('id, from_user, status, created_at, profiles!match_requests_from_user_fkey(id, riot_id, riot_tag, avatar_url, current_rank)')
    .eq('to_user', myProfile.id)
    .neq('status', 'declined')
    .order('created_at', { ascending: false });

  // Get outgoing requests too (to show sent status)
  const { data: outgoingRequests } = await supabase
    .from('match_requests')
    .select('id, to_user, status, created_at, profiles!match_requests_to_user_fkey(id, riot_id, riot_tag, avatar_url, current_rank)')
    .eq('from_user', myProfile.id)
    .order('created_at', { ascending: false });

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, user_a, user_b, created_at')
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`);

  // Unread new_message notifications to show badge counts per conversation
  const { data: unreadNotifs } = await supabase
    .from('notifications')
    .select('related_user')
    .eq('user_id', myProfile.id)
    .eq('type', 'new_message')
    .eq('read', false);

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

  // Build conversation items with last message timestamp for sorting
  const convItems = [];
  for (const conv of conversations ?? []) {
    const otherUserId = conv.user_a === myProfile.id ? conv.user_b : conv.user_a;
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, riot_id, riot_tag, avatar_url, current_rank')
      .eq('id', otherUserId)
      .single();

    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    convItems.push({
      id: conv.id,
      type: 'conversation' as const,
      user: otherUser,
      last_message: lastMsg?.content ?? null,
      last_message_at: lastMsg?.created_at ?? conv.created_at,
      unread: unreadByUser[otherUserId] ?? 0,
      conversation_id: conv.id,
      created_at: conv.created_at,
    });
  }

  // Sort conversations by most recent message first
  convItems.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  items.push(...convItems);

  return NextResponse.json({ items, my_profile_id: myProfile.id });
}
