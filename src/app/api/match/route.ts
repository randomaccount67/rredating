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
  const gender = searchParams.get('gender');
  const micOnly = searchParams.get('mic_only') === '1';

  const supabase = createServiceClient();

  // Get my profile ID
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ profiles: [], hasMore: false, requestStatuses: {} });

  // Get passes and already-sent requests — exclude both from browse
  const [{ data: passes }, { data: sentRequests }] = await Promise.all([
    supabase.from('passes').select('to_user').eq('from_user', myProfile.id),
    supabase.from('match_requests').select('to_user').eq('from_user', myProfile.id),
  ]);

  const excludedIds = [
    ...(passes?.map(p => p.to_user) ?? []),
    ...(sentRequests?.map(r => r.to_user) ?? []),
  ];

  // Fetch 2x batch so shuffling feels random; 4x was 48 rows of select(*) per request
  const fetchLimit = limit * 2;
  const fetchOffset = page * fetchLimit;

  // Build query — select only columns needed by browse cards and ProfileModal (skip internal/admin fields)
  let query = supabase
    .from('profiles')
    .select('id, riot_id, riot_tag, region, current_rank, peak_rank, role, agents, music_tags, about, avatar_url, gender, is_online, created_at, mic_on, favorite_artist')
    .eq('confirmed_18', true)
    .eq('is_banned', false)
    .neq('id', myProfile.id)
    .range(fetchOffset, fetchOffset + fetchLimit);

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`);
  }
  if (region) query = query.eq('region', region);
  if (role) query = query.eq('role', role);
  if (micOnly) query = query.eq('mic_on', true);
  if (rankTier && rankTier !== 'Any') {
    query = query.ilike('current_rank', `${rankTier}%`);
  }
  if (gender === 'Male' || gender === 'Female') {
    query = query.eq('gender', gender);
  } else if (gender === 'Other') {
    // Other = anything that isn't Male or Female
    query = query.neq('gender', 'Male').neq('gender', 'Female').not('gender', 'is', null);
  }

  const { data: rawProfiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Shuffle the batch so order is random on every load
  const shuffled = (rawProfiles ?? []).sort(() => Math.random() - 0.5);
  const hasMore = shuffled.length > limit;
  const profiles = shuffled.slice(0, limit);

  // Get request statuses for returned profiles
  const profileIds = profiles.map(p => p.id);
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

  return NextResponse.json({ profiles, hasMore, requestStatuses });
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
