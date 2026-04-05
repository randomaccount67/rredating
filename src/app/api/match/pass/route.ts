import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to_user_profile_id } = await req.json();
  if (!to_user_profile_id) return NextResponse.json({ error: 'Missing to_user' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // upsert with ignoreDuplicates to handle the unique constraint gracefully
  await supabase
    .from('passes')
    .upsert({ from_user: myProfile.id, to_user: to_user_profile_id }, { ignoreDuplicates: true });

  return NextResponse.json({ success: true });
}
