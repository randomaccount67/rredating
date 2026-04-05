import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const limit = 12;
  const offset = page * limit;

  const region = searchParams.get('region');
  const rankTier = searchParams.get('rank_tier');
  const role = searchParams.get('role');
  const micOnly = searchParams.get('mic_only') === '1';

  const supabase = createServiceClient();

  // Get my profile ID
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ profiles: [], hasMore: false, requestStatuses: {} });

  // Get passes
  const { data: passes } = await supabase
    .from('passes')
    .select('to_user')
    .eq('from_user', myProfile.id);

  const passedIds = passes?.map(p => p.to_user) ?? [];

  // Build query
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('confirmed_18', true)
    .neq('id', myProfile.id)
    .range(offset, offset + limit - 1);

  if (passedIds.length > 0) {
    query = query.not('id', 'in', `(${passedIds.join(',')})`);
  }
  if (region) query = query.eq('region', region);
  if (role) query = query.eq('role', role);
  if (micOnly) query = query.eq('mic_on', true);
  if (rankTier && rankTier !== 'Any') {
    query = query.ilike('current_rank', `${rankTier}%`);
  }

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get request statuses for returned profiles
  const profileIds = profiles?.map(p => p.id) ?? [];
  let requestStatuses: Record<string, string> = {};

  if (profileIds.length > 0) {
    const { data: requests } = await supabase
      .from('match_requests')
      .select('to_user, from_user, status')
      .or(`from_user.eq.${myProfile.id},to_user.eq.${myProfile.id}`)
      .in('from_user', [myProfile.id, ...profileIds])
      .in('to_user', [myProfile.id, ...profileIds]);

    requests?.forEach(r => {
      const otherId = r.from_user === myProfile.id ? r.to_user : r.from_user;
      if (profileIds.includes(otherId)) {
        requestStatuses[otherId] = r.status;
      }
    });
  }

  return NextResponse.json({
    profiles: profiles ?? [],
    hasMore: (profiles?.length ?? 0) === limit + 1,
    requestStatuses,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to_user_profile_id } = await req.json();
  if (!to_user_profile_id) return NextResponse.json({ error: 'Missing to_user' }, { status: 400 });

  const supabase = createServiceClient();

  // Get my profile
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (myProfile.id === to_user_profile_id) return NextResponse.json({ error: 'Cannot request yourself' }, { status: 400 });

  // Check if they already sent us a request
  const { data: reverseRequest } = await supabase
    .from('match_requests')
    .select('id, status')
    .eq('from_user', to_user_profile_id)
    .eq('to_user', myProfile.id)
    .single();

  if (reverseRequest && reverseRequest.status === 'pending') {
    // Mutual match — update to matched
    const { error: updateErr } = await supabase
      .from('match_requests')
      .update({ status: 'matched' })
      .eq('id', reverseRequest.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Create conversation
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_a: myProfile.id, user_b: to_user_profile_id })
      .select()
      .single();

    // Create notifications for both
    await supabase.from('notifications').insert([
      { user_id: myProfile.id, type: 'matched', related_user: to_user_profile_id },
      { user_id: to_user_profile_id, type: 'matched', related_user: myProfile.id },
    ]);

    return NextResponse.json({ status: 'matched', conversation_id: conv?.id });
  }

  // Insert new request
  const { error } = await supabase
    .from('match_requests')
    .insert({ from_user: myProfile.id, to_user: to_user_profile_id, status: 'pending' });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ status: 'pending' }); // already exists
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify target
  await supabase.from('notifications').insert({
    user_id: to_user_profile_id,
    type: 'match_request',
    related_user: myProfile.id,
  });

  return NextResponse.json({ status: 'pending' });
}
