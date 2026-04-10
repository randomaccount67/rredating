import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // In production build-time, we return a client with placeholders to allow tracing to complete
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder');
  }

  return createBrowserClient(url, anonKey);
}
