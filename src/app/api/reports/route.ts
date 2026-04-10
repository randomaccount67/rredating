import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { reported_profile_id, reason, details } = body;

  if (!reported_profile_id || !reason) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (details && details.length > 2000) {
    return NextResponse.json({ error: 'Details too long (max 2000 chars)' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get reporter's profile
  const { data: reporter } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!reporter) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (reporter.id === reported_profile_id) {
    return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: reporter.id,
    reported_id: reported_profile_id,
    reason,
    details: details?.trim() || null,
  });

  if (error) {
    console.error('[reports POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
