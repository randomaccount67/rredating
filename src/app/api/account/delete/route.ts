import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (myProfile) {
    // Get conversation IDs so we can delete messages first
    const { data: userConversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`);

    const convIds = userConversations?.map(c => c.id) ?? [];

    // Delete all associated data in parallel (child tables first)
    await Promise.all([
      convIds.length > 0
        ? supabase.from('messages').delete().in('conversation_id', convIds)
        : Promise.resolve({ data: null, error: null }),
      supabase.from('conversation_viewers').delete().eq('user_id', myProfile.id),
      supabase.from('notifications').delete()
        .or(`user_id.eq.${myProfile.id},related_user.eq.${myProfile.id}`),
      supabase.from('match_requests').delete()
        .or(`from_user.eq.${myProfile.id},to_user.eq.${myProfile.id}`),
      supabase.from('passes').delete()
        .or(`from_user.eq.${myProfile.id},to_user.eq.${myProfile.id}`),
      supabase.from('reports').delete()
        .or(`reporter_id.eq.${myProfile.id},reported_id.eq.${myProfile.id}`),
    ]);

    // Delete conversations after messages are gone
    if (convIds.length > 0) {
      await supabase.from('conversations').delete().in('id', convIds);
    }

    // Delete the profile
    await supabase.from('profiles').delete().eq('id', myProfile.id);
  }

  // Delete Clerk account last (invalidates all sessions)
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  } catch (e) {
    console.error('[account/delete] Clerk deletion failed:', e);
    return NextResponse.json({ error: 'Failed to delete account from auth provider' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
