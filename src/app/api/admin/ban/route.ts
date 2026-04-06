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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { profile_id, ban } = await req.json();
  if (!profile_id || typeof ban !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get the requesting admin's own profile ID
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!adminProfile) return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });

  // Prevent self-ban
  if (adminProfile.id === profile_id) {
    return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
  }

  // Prevent banning other admins
  const { data: target } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', profile_id)
    .single();

  if (target?.is_admin) {
    return NextResponse.json({ error: 'Cannot ban another admin' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: ban })
    .eq('id', profile_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
