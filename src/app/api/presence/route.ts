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

  // No conversation ownership check here — saves a DB query per ping.
  // Worst case an attacker writes a viewer row for a conversation they're not in,
  // which grants them nothing (messages are checked separately in /api/messages).
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
