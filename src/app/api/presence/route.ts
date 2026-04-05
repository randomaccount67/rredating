import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversation_id } = await req.json();
  if (!conversation_id) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Verify user belongs to this conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`)
    .single();

  if (!conv) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  await supabase
    .from('conversation_viewers')
    .upsert(
      { user_id: myProfile.id, conversation_id, last_seen_at: new Date().toISOString() },
      { onConflict: 'user_id,conversation_id' }
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversation_id } = await req.json();
  if (!conversation_id) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ ok: true });

  await supabase
    .from('conversation_viewers')
    .delete()
    .eq('user_id', myProfile.id)
    .eq('conversation_id', conversation_id);

  return NextResponse.json({ ok: true });
}
