import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { request_id, action } = await req.json();
  if (!request_id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Verify the request is for this user
  const { data: request } = await supabase
    .from('match_requests')
    .select('*')
    .eq('id', request_id)
    .eq('to_user', myProfile.id)
    .single();

  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  if (action === 'decline') {
    await supabase.from('match_requests').update({ status: 'declined' }).eq('id', request_id);
    return NextResponse.json({ status: 'declined' });
  }

  // Accept
  await supabase.from('match_requests').update({ status: 'matched' }).eq('id', request_id);

  // Create conversation
  const { data: conv } = await supabase
    .from('conversations')
    .insert({ user_a: request.from_user, user_b: myProfile.id })
    .select()
    .single();

  // Notify both
  await supabase.from('notifications').insert([
    { user_id: myProfile.id, type: 'matched', related_user: request.from_user },
    { user_id: request.from_user, type: 'matched', related_user: myProfile.id },
  ]);

  return NextResponse.json({ status: 'matched', conversation_id: conv?.id });
}
