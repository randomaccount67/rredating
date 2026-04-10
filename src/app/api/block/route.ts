import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { blocked_profile_id } = await req.json();
  if (!blocked_profile_id) return NextResponse.json({ error: 'Missing blocked_profile_id' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (myProfile.id === blocked_profile_id) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  // Insert block (ignore if already blocked)
  const { error: blockError } = await supabase
    .from('blocked_users')
    .upsert(
      { blocker_id: myProfile.id, blocked_id: blocked_profile_id },
      { ignoreDuplicates: true }
    );

  if (blockError) return NextResponse.json({ error: blockError.message }, { status: 500 });

  // Find conversation between the two users
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`)
    .or(`user_a.eq.${blocked_profile_id},user_b.eq.${blocked_profile_id}`)
    .maybeSingle();

  if (conv) {
    // Delete messages and viewers, then the conversation
    await Promise.all([
      supabase.from('messages').delete().eq('conversation_id', conv.id),
      supabase.from('conversation_viewers').delete().eq('conversation_id', conv.id),
    ]);
    await supabase.from('conversations').delete().eq('id', conv.id);
  }

  // Remove match requests between the two users in both directions
  await supabase
    .from('match_requests')
    .delete()
    .or(`from_user.eq.${myProfile.id},to_user.eq.${myProfile.id}`)
    .or(`from_user.eq.${blocked_profile_id},to_user.eq.${blocked_profile_id}`);

  // Remove any notifications sent between the two
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', myProfile.id)
    .eq('related_user', blocked_profile_id);

  return NextResponse.json({ success: true });
}
