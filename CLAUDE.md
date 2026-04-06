# RRedating — Claude Code Context

## What this project is
A Valorant duo-dating/edating web app. Not serious. Users create profiles with their Riot ID, rank, role, agents, music taste, etc. and can send match requests to other players. Think Tinder but for finding a Valorant duo.

## Stack
- **Next.js 14** (App Router)
- **Clerk** (auth, v6.39.1) — all auth goes through Clerk, never Supabase Auth
- **Supabase** (Postgres database + realtime + storage)
- **TailwindCSS** (utility-first styling)
- **TypeScript**

## Critical rules

### Middleware
- Do NOT rewrite `src/middleware.ts` — it has a specific two-entry matcher array and must return `NextResponse.next()` at the end
- Changing the matcher or removing the return statement breaks Clerk on Vercel (MIDDLEWARE_INVOCATION_FAILED)

### layout.tsx
- Do NOT add `export const dynamic = 'force-dynamic'` to `src/app/layout.tsx` — it breaks Clerk initialization and kills all CSS on Vercel
- Individual page files can have it, but never the root layout

### Dynamic rendering
- All page files (not layout) should have `export const dynamic = 'force-dynamic'` at the top to prevent Clerk prerendering errors

### Supabase clients
- Use `createServiceClient()` for all API routes (bypasses RLS, server-side only)
- Use `createClient()` (browser) for client components that need realtime

## Database schema (key tables)
- `profiles` — main user profiles, linked to Clerk via `clerk_user_id`
- `match_requests` — pending/matched/declined requests between profiles
- `conversations` — matched pairs who can message
- `messages` — individual messages in a conversation
- `notifications` — match_request, matched, new_message types
- `conversation_viewers` — presence tracking (who is actively viewing a thread)
- `reports` — user reports filed against other users
- `passes` — profiles a user has passed on (skipped)

## Key columns added via migration (not in original schema)
- `profiles.gender` — text, nullable
- `profiles.favorite_artist` — text, nullable
- `profiles.is_admin` — boolean, default false
- `profiles.is_banned` — boolean, default false

## Admin system
- `/admin` page — only visible/accessible to users with `is_admin = true`
- Admin checks happen server-side on every API request, not just page load
- `is_banned` and `is_admin` columns are revoked from anon/authenticated Supabase roles — only the service role can modify them
- Admins cannot ban themselves or other admins

## Styling
- Dark Valorant aesthetic: primary bg `#0F1013`, card `#1A1D24`, accent `#FF4655`
- Fonts: Barlow Condensed (headings), Share Tech Mono (mono text), Rajdhani
- Clip-path used extensively for the angled corner aesthetic
- Custom utility classes defined in `globals.css` (btn-ghost, btn-primary, label, etc.)

## Deployment
- Hosted on Vercel
- Environment variables: Clerk publishable/secret keys, Supabase URL/anon key/service key, NEXT_PUBLIC_SITE_URL
- Site URL: rredating.com
