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

  if (!myProfile) return NextResponse.json({ notifications: [] });

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, profiles!notifications_related_user_fkey(riot_id, riot_tag)')
    .eq('user_id', myProfile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Build a map of other_user_id -> conversation_id so new_message notifications link directly
  const { data: myConversations } = await supabase
    .from('conversations')
    .select('id, user_a, user_b')
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`);

  const convByUser: Record<string, string> = {};
  for (const conv of myConversations ?? []) {
    const otherId = conv.user_a === myProfile.id ? conv.user_b : conv.user_a;
    convByUser[otherId] = conv.id;
  }

  const formatted = notifications?.map(n => ({
    id: n.id,
    type: n.type,
    related_user: Array.isArray(n.profiles) ? n.profiles[0] : n.profiles,
    read: n.read,
    created_at: n.created_at,
    conversation_id: n.type === 'new_message' ? (convByUser[n.related_user] ?? null) : null,
  })) ?? [];

  return NextResponse.json({ notifications: formatted });
}
