import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Singleton Supabase service client — bypasses RLS.
// Eliminates the 27× per-request instantiation from the old codebase.
export const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
