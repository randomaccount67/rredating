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

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, riot_id, riot_tag),
      reported:profiles!reports_reported_id_fkey(id, riot_id, riot_tag)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/reports GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { report_id } = await req.json();
  if (!report_id) return NextResponse.json({ error: 'Missing report_id' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('reports')
    .update({ reviewed: true })
    .eq('id', report_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
