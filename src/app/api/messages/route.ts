import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Filter } from 'bad-words';

const filter = new Filter();

// Simple in-memory rate limiter: 30 messages/minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversation_id');
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Verify user is in this conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`)
    .single();

  if (!conv) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const otherUserId = conv.user_a === myProfile.id ? conv.user_b : conv.user_a;

  const { data: otherUser } = await supabase
    .from('profiles')
    .select('id, riot_id, riot_tag, avatar_url')
    .eq('id', otherUserId)
    .single();

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    id: conv.id,
    other_user: otherUser,
    messages: messages ?? [],
    my_profile_id: myProfile.id,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Rate limit exceeded (30 messages/min)' }, { status: 429 });
  }

  const { conversation_id, content } = await req.json();
  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Verify user is in this conversation (hard enforce)
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_a, user_b')
    .eq('id', conversation_id)
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`)
    .single();

  if (!conv) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  // Sanitize content
  let cleanContent = content.trim();
  try { cleanContent = filter.clean(cleanContent); } catch { /* non-ASCII */ }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      sender_id: myProfile.id,
      content: cleanContent,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only notify the other user — never the sender
  const otherUserId = conv.user_a === myProfile.id ? conv.user_b : conv.user_a;

  // Safety guard: skip notification entirely if the resolved target is the sender
  if (otherUserId !== myProfile.id) {
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
    const { data: viewerEntry } = await supabase
      .from('conversation_viewers')
      .select('last_seen_at')
      .eq('user_id', otherUserId)
      .eq('conversation_id', conversation_id)
      .gte('last_seen_at', thirtySecondsAgo)
      .maybeSingle();

    if (!viewerEntry) {
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        type: 'new_message',
        related_user: myProfile.id,
      });
    }
  }

  return NextResponse.json({ message });
}
