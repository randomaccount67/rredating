import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Filter } from 'bad-words';

const filter = new Filter();

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[profile GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  if (!body.confirmed_18) {
    return NextResponse.json({ error: 'Must confirm 18+' }, { status: 400 });
  }

  // Sanitize about field
  let about = body.about ?? '';
  try { about = filter.clean(about); } catch { /* non-ASCII — leave as is */ }

  const supabase = createServiceClient();

  const profileData = {
    clerk_user_id: userId,
    gender: body.gender?.trim() || null,
    riot_id: body.riot_id?.trim() || null,
    riot_tag: body.riot_tag?.trim() || null,
    region: body.region || null,
    peak_rank: body.peak_rank || null,
    current_rank: body.current_rank || null,
    role: body.role || null,
    agents: body.agents?.length ? body.agents : null,
    mic_on: body.mic_on ?? true,
    avg_acs: body.avg_acs ? parseInt(body.avg_acs, 10) : null,
    reports_this_act: body.reports_this_act ? parseInt(body.reports_this_act, 10) : 0,
    music_tags: body.music_tags?.length ? body.music_tags : null,
    favorite_artist: body.favorite_artist?.trim() || null,
    about: about || null,
    avatar_url: body.avatar_url || null,
    confirmed_18: true,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    console.error('[profile POST]', error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  let about = body.about ?? '';
  try { about = filter.clean(about); } catch { /* non-ASCII */ }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      clerk_user_id: userId,
      gender: body.gender?.trim() || null,
      riot_id: body.riot_id?.trim() || null,
      riot_tag: body.riot_tag?.trim() || null,
      region: body.region || null,
      peak_rank: body.peak_rank || null,
      current_rank: body.current_rank || null,
      role: body.role || null,
      agents: body.agents?.length ? body.agents : null,
      mic_on: body.mic_on ?? true,
      avg_acs: body.avg_acs ? parseInt(body.avg_acs, 10) : null,
      reports_this_act: body.reports_this_act ? parseInt(body.reports_this_act, 10) : 0,
      music_tags: body.music_tags?.length ? body.music_tags : null,
      favorite_artist: body.favorite_artist?.trim() || null,
      about: about || null,
      avatar_url: body.avatar_url || null,
      confirmed_18: true,
    }, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    console.error('[profile PUT]', error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
