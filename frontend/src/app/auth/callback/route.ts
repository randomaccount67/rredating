import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * OAuth callback handler — exchanges the code from the OAuth provider
 * for a Supabase session (sets session cookies).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Validate redirect target — prevent open redirect via ?next=@evil.com or ?next=//evil.com
  const raw = searchParams.get('next') ?? '/match';
  const next = raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('@') ? raw : '/match';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // OAuth error — redirect to sign-in with error indicator
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
