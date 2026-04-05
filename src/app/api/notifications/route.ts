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

  const formatted = notifications?.map(n => ({
    id: n.id,
    type: n.type,
    related_user: Array.isArray(n.profiles) ? n.profiles[0] : n.profiles,
    read: n.read,
    created_at: n.created_at,
  })) ?? [];

  return NextResponse.json({ notifications: formatted });
}
