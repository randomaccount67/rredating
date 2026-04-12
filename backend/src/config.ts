function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function parseFrontendOrigins(): string[] {
  const raw =
    process.env.FRONTEND_URL
    || (process.env.NODE_ENV === 'production'
      ? (() => {
          console.error('❌ FRONTEND_URL is required in production');
          process.exit(1);
        })() as never
      : 'http://localhost:3000');
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  emailHmacSecret: requireEnv('EMAIL_HMAC_SECRET'),
  nodeEnv: process.env.NODE_ENV || 'development',
  /** One or more allowed browser origins (comma-separated). Include both apex and www if you use both. */
  frontendOrigins: parseFrontendOrigins(),
  /** Upstash Redis — optional. When absent, rate limiting falls back to in-process memory. */
  upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL ?? null,
  upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? null,
} as const;

