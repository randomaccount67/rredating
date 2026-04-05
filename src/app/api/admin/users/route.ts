import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

async function checkAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('clerk_user_id', userId)
    .single();
  return data?.is_admin === true;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, riot_id, riot_tag, region, created_at, is_banned, is_admin, avatar_url, about, agents, peak_rank, current_rank, role, gender, favorite_artist, music_tags')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data });
}
