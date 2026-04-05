# RRedating — Setup Guide

NOT affiliated with or endorsed by Riot Games. For entertainment only. 18+.

## Step 1: Clerk Setup

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Name it "RRedating"
3. Enable **Discord OAuth** as the primary provider
4. Enable **Email/Password** as fallback
5. Copy your keys to `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
6. In Clerk dashboard → Redirects, set:
   - Sign-in redirect: `/onboarding`
   - Sign-up redirect: `/onboarding`

## Step 2: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your keys to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In Supabase SQL Editor, run the contents of `supabase-schema.sql`
4. Verify tables were created: profiles, match_requests, conversations, messages, notifications, passes
5. Verify the `avatars` storage bucket was created (Storage tab)
6. Enable Realtime for `messages` and `notifications` tables (Database → Replication)

## Step 3: Local Dev

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 4: Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add all env vars from `.env.local` to Vercel dashboard
4. Deploy

## Route Reference

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/sign-in` | Clerk sign in |
| `/sign-up` | Clerk sign up |
| `/onboarding` | Profile setup (first-time) |
| `/match` | Browse profiles |
| `/inbox` | Match requests + conversations |
| `/inbox/[id]` | Message thread |
| `/profile` | Edit own profile |
| `/profile/[id]` | View another user's profile |
| `/notifications` | Notification feed |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/disclaimer` | Riot Games non-affiliation notice |

## Notes

- All in-game data is self-reported (honor system)
- No Riot Games API integration
- Profanity filter on messages and about field (bad-words library)
- Rate limit: 30 messages/minute per user
- Avatar uploads: images only, max 2MB
- Messaging is matched-only — enforced server-side
