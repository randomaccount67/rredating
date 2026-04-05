import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userA = searchParams.get('user_a');
  const userB = searchParams.get('user_b');

  if (!userA || !userB) return NextResponse.json({ error: 'Missing user IDs' }, { status: 400 });

  const supabase = createServiceClient();

  // Find conversation between these two users
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`)
    .single();

  if (!conv) return NextResponse.json({ messages: [], found: false });

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ messages: messages ?? [], found: true });
}
