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
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: ban })
    .eq('id', profile_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
