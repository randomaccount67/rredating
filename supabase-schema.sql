-- ============================================================
-- RREDATING — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique not null,
  email_hash text,
  riot_id text,
  riot_tag text,
  region text,
  peak_rank text,
  current_rank text,
  role text,
  agents text[],
  mic_on boolean default true,
  avg_acs integer,
  reports_this_act integer default 0,
  gender text,
  music_tags text[],
  favorite_artist text,
  about text,
  avatar_url text,
  confirmed_18 boolean default false,
  is_online boolean default false,
  last_seen timestamptz,
  is_admin boolean default false,
  is_banned boolean default false,
  age integer,
  created_at timestamptz default now()
);

-- Match requests
create table if not exists match_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references profiles(id) on delete cascade,
  to_user uuid references profiles(id) on delete cascade,
  status text default 'pending', -- pending | matched | declined
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

-- Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text, -- match_request | matched | new_message
  related_user uuid references profiles(id) on delete set null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Conversation viewers (presence tracking)
create table if not exists conversation_viewers (
  user_id uuid references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  last_seen_at timestamptz default now(),
  primary key (user_id, conversation_id)
);

-- Passes
create table if not exists passes (
  from_user uuid references profiles(id) on delete cascade,
  to_user uuid references profiles(id) on delete cascade,
  primary key (from_user, to_user)
);

-- Reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete cascade,
  reported_id uuid references profiles(id) on delete cascade,
  reason text not null,
  details text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

-- Blocked users
create table if not exists blocked_users (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);
create index if not exists idx_profiles_email_hash on profiles(email_hash);
create index if not exists idx_profiles_region on profiles(region);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_current_rank on profiles(current_rank);
create index if not exists idx_match_requests_from_user on match_requests(from_user);
create index if not exists idx_match_requests_to_user on match_requests(to_user);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_passes_from_user on passes(from_user);
create index if not exists idx_conversation_viewers_user_id on conversation_viewers(user_id);
create index if not exists idx_conversation_viewers_conversation_id on conversation_viewers(conversation_id);
create index if not exists idx_reports_reporter_id on reports(reporter_id);
create index if not exists idx_reports_reported_id on reports(reported_id);
create index if not exists idx_blocked_users_blocker_id on blocked_users(blocker_id);
create index if not exists idx_blocked_users_blocked_id on blocked_users(blocked_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- IMPORTANT: If upgrading from existing wide-open policies, you must
-- DROP the old policies first before creating these. Example:
--   DROP POLICY "Profiles are publicly readable" ON profiles;
-- ============================================================

alter table profiles enable row level security;
alter table match_requests enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table passes enable row level security;
alter table conversation_viewers enable row level security;
alter table reports enable row level security;
alter table blocked_users enable row level security;

-- The service role key (used by the Express backend) bypasses ALL RLS.
-- These policies ONLY constrain clients using the anon key (browser).
-- Goal: anon key can only READ own data. All mutations go through the backend.

-- ─── PROFILES ──────────────────────────────────────────────────
-- Allow public reads of profiles (browse page, public profile view)
create policy "Profiles are publicly readable" on profiles
  for select using (true);

-- Deny anon inserts/updates/deletes — only the backend (service role) mutates
create policy "Only service role can insert profiles" on profiles
  for insert with check (false);

create policy "Only service role can update profiles" on profiles
  for update using (false);

create policy "Only service role can delete profiles" on profiles
  for delete using (false);

-- ─── MATCH_REQUESTS ────────────────────────────────────────────
create policy "Users see own match requests" on match_requests
  for select using (
    from_user IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
    OR to_user IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can insert match requests" on match_requests
  for insert with check (false);

create policy "Only service role can update match requests" on match_requests
  for update using (false);

create policy "Only service role can delete match requests" on match_requests
  for delete using (false);

-- ─── CONVERSATIONS ─────────────────────────────────────────────
create policy "Users see own conversations" on conversations
  for select using (
    user_a IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
    OR user_b IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can insert conversations" on conversations
  for insert with check (false);

create policy "Only service role can delete conversations" on conversations
  for delete using (false);

-- ─── MESSAGES ──────────────────────────────────────────────────
-- Users can read messages in their own conversations (needed for Realtime subscriptions)
create policy "Users see messages in own conversations" on messages
  for select using (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_a IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
         OR user_b IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
    )
  );

create policy "Only service role can insert messages" on messages
  for insert with check (false);

create policy "Only service role can delete messages" on messages
  for delete using (false);

-- ─── NOTIFICATIONS ─────────────────────────────────────────────
create policy "Users see own notifications" on notifications
  for select using (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can insert notifications" on notifications
  for insert with check (false);

create policy "Only service role can update notifications" on notifications
  for update using (false);

create policy "Only service role can delete notifications" on notifications
  for delete using (false);

-- ─── PASSES ────────────────────────────────────────────────────
create policy "Users see own passes" on passes
  for select using (
    from_user IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can insert passes" on passes
  for insert with check (false);

create policy "Only service role can delete passes" on passes
  for delete using (false);

-- ─── CONVERSATION_VIEWERS ──────────────────────────────────────
create policy "Users see own viewer entries" on conversation_viewers
  for select using (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can manage viewers" on conversation_viewers
  for insert with check (false);

create policy "Only service role can update viewers" on conversation_viewers
  for update using (false);

create policy "Only service role can delete viewers" on conversation_viewers
  for delete using (false);

-- ─── REPORTS ───────────────────────────────────────────────────
create policy "Users see own reports" on reports
  for select using (
    reporter_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can insert reports" on reports
  for insert with check (false);

create policy "Only service role can update reports" on reports
  for update using (false);

create policy "Only service role can delete reports" on reports
  for delete using (false);

-- ─── BLOCKED_USERS ─────────────────────────────────────────────
create policy "Users see own blocks" on blocked_users
  for select using (
    blocker_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

create policy "Only service role can insert blocks" on blocked_users
  for insert with check (false);

create policy "Only service role can delete blocks" on blocked_users
  for delete using (false);

-- ============================================================
-- BROWSE — RPC used by backend match service (avoids huge query strings)
-- ============================================================
-- Run idempotently alongside the rest of this file. If this was missing in
-- production, GET /api/match returned empty while admin lists still worked.
create or replace function public.get_browseable_profiles(viewer_id uuid)
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.*
  from profiles p
  where p.confirmed_18 = true
    and p.is_banned = false
    and p.id != viewer_id
    and p.id not in (
      select to_user from passes where from_user = viewer_id
    )
    and p.id not in (
      select to_user from match_requests where from_user = viewer_id and status in ('pending', 'matched')
    )
    and p.id not in (
      select blocked_id from blocked_users where blocker_id = viewer_id
    )
    and p.id not in (
      select blocker_id from blocked_users where blocked_id = viewer_id
    );
end;
$$;

grant execute on function public.get_browseable_profiles(uuid) to anon, authenticated, service_role;

-- ============================================================
-- REALTIME — enable realtime for messages and notifications
-- ============================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;

-- ============================================================
-- STORAGE — create avatars bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Only service role can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' AND false);

create policy "Only service role can update avatars" on storage.objects
  for update with check (bucket_id = 'avatars' AND false);

-- ============================================================
-- STORAGE CLEANUP — remove orphaned avatars policy
-- ============================================================
create policy "Only service role can delete avatars" on storage.objects
  for delete using (bucket_id = 'avatars' AND false);
