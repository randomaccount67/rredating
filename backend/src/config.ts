function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  emailHmacSecret: requireEnv('EMAIL_HMAC_SECRET'),
  nodeEnv: process.env.NODE_ENV || 'development',
  // L5 fix: FRONTEND_URL is required in production to prevent CORS misconfiguration
  frontendUrl: process.env.FRONTEND_URL
    || (process.env.NODE_ENV === 'production' ? (() => { console.error('❌ FRONTEND_URL is required in production'); process.exit(1); })() as never : 'http://localhost:3000'),
} as const;

