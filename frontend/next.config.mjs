/** @type {import('next').NextConfig} */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHost = supabaseUrl ? (() => { try { return new URL(supabaseUrl).hostname; } catch { return '*.supabase.co'; } })() : '*.supabase.co';
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

// Build CSP — allow Supabase (HTTPS + WSS realtime), Google OAuth, fonts, and backend API
const cspHeader = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for its runtime scripts; unsafe-eval for development HMR
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  // Tailwind and next inject inline styles; Google Fonts stylesheet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts files
  "font-src 'self' data: https://fonts.gstatic.com",
  // Avatars from Supabase storage
  `img-src 'self' data: blob: https://${supabaseHost} https://*.supabase.co https://*.supabase.in`,
  // Supabase API + realtime WebSocket, Google OAuth, backend API
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://accounts.google.com https://*.googleapis.com ${apiUrl}`,
  // Google OAuth popup/redirect
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
