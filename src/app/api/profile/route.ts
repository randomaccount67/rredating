import { auth, clerkClient } from '@clerk/nextjs/server';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Filter } from 'bad-words';

const filter = new Filter();

// Hash email with HMAC-SHA256 so plaintext is never stored in the database.
// Still allows deterministic lookup across auth provider re-links.
function hashEmail(email: string): string {
  const secret = process.env.EMAIL_HMAC_SECRET ?? 'rredating-fallback-secret';
  return createHmac('sha256', secret).update(email.toLowerCase().trim()).digest('hex');
}

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const primary = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    return primary?.emailAddress ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (data) return NextResponse.json({ profile: data });

  if (error && error.code !== 'PGRST116') {
    console.error('[profile GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // No profile found — check if another Clerk account with the same email has a profile
  // This handles the case where a user signed up with a different auth provider on another device
  try {
    const email = await getUserEmail(userId);
    if (email) {
      const emailHash = hashEmail(email);
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email_hash', emailHash)
        .single();

      if (existingProfile) {
        // Re-link this profile to the current Clerk user ID
        await supabase
          .from('profiles')
          .update({ clerk_user_id: userId })
          .eq('id', existingProfile.id);
        return NextResponse.json({ profile: { ...existingProfile, clerk_user_id: userId } });
      }
    }
  } catch {
    // Email linking is best-effort — fall through to null
  }

  return NextResponse.json({ profile: null });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  if (!body.confirmed_18) {
    return NextResponse.json({ error: 'Must confirm 18+' }, { status: 400 });
  }

  const age = body.age != null ? parseInt(body.age, 10) : null;
  if (age !== null && (isNaN(age) || age < 18 || age > 99)) {
    return NextResponse.json({ error: 'Age must be between 18 and 99' }, { status: 400 });
  }

  let about = body.about ?? '';
  try { about = filter.clean(about); } catch { /* non-ASCII — leave as is */ }

  const supabase = createServiceClient();
  const email = await getUserEmail(userId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const allowedAvatarHost = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];
  const avatarUrl = body.avatar_url || null;
  if (avatarUrl) {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.hostname !== allowedAvatarHost) {
        return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
    }
  }

  // Check if another account already has a profile with this email hash
  if (email) {
    const emailHash = hashEmail(email);
    try {
      const { data: existingByEmail } = await supabase
        .from('profiles')
        .select('id, clerk_user_id')
        .eq('email_hash', emailHash)
        .neq('clerk_user_id', userId)
        .single();

      if (existingByEmail) {
        // Re-link the existing profile to this Clerk user ID and update it
        const profileData = {
          clerk_user_id: userId,
          email_hash: emailHash,
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
          music_tags: body.music_tags?.length ? body.music_tags : null,
          favorite_artist: body.favorite_artist?.trim() || null,
          about: about || null,
          avatar_url: avatarUrl,
          confirmed_18: true,
          age,
        };
        await supabase.from('profiles').update(profileData).eq('id', existingByEmail.id);
        const { data: updated } = await supabase.from('profiles').select('*').eq('id', existingByEmail.id).single();
        return NextResponse.json({ profile: updated });
      }
    } catch {
      // email_hash column may not exist yet — fall through to normal upsert
    }
  }

  const emailHash = email ? hashEmail(email) : null;
  const profileData = {
    clerk_user_id: userId,
    email_hash: emailHash,
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
    music_tags: body.music_tags?.length ? body.music_tags : null,
    favorite_artist: body.favorite_artist?.trim() || null,
    about: about || null,
    avatar_url: avatarUrl,
    confirmed_18: true,
    age,
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

  const age = body.age != null ? parseInt(body.age, 10) : null;
  if (age !== null && (isNaN(age) || age < 18 || age > 99)) {
    return NextResponse.json({ error: 'Age must be between 18 and 99' }, { status: 400 });
  }

  let about = body.about ?? '';
  try { about = filter.clean(about); } catch { /* non-ASCII */ }

  const supabase = createServiceClient();
  const email = await getUserEmail(userId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const allowedAvatarHost = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];
  const avatarUrl = body.avatar_url || null;
  if (avatarUrl) {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.hostname !== allowedAvatarHost) {
        return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
    }
  }

  const emailHash = email ? hashEmail(email) : null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      clerk_user_id: userId,
      email_hash: emailHash,
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
      music_tags: body.music_tags?.length ? body.music_tags : null,
      favorite_artist: body.favorite_artist?.trim() || null,
      about: about || null,
      avatar_url: avatarUrl,
      confirmed_18: true,
      age,
    }, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    console.error('[profile PUT]', error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
