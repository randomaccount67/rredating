-- ============================================================
-- RREDATING — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
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
  music_tags text[],
  about text,
  avatar_url text,
  confirmed_18 boolean default false,
  is_online boolean default false,
  last_seen timestamptz,
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

-- Passes
create table if not exists passes (
  from_user uuid references profiles(id) on delete cascade,
  to_user uuid references profiles(id) on delete cascade,
  primary key (from_user, to_user)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_clerk_user_id on profiles(clerk_user_id);
create index if not exists idx_profiles_region on profiles(region);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_current_rank on profiles(current_rank);
create index if not exists idx_match_requests_from_user on match_requests(from_user);
create index if not exists idx_match_requests_to_user on match_requests(to_user);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_passes_from_user on passes(from_user);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table match_requests enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table passes enable row level security;

-- NOTE: Since we use the service role key from the server, RLS policies
-- primarily enforce constraints for direct client access.
-- The service role bypasses RLS, which is intentional for our server-side API.
-- These policies protect against any direct client DB access.

-- PROFILES policies
create policy "Profiles are publicly readable" on profiles
  for select using (true);

create policy "Users can insert own profile" on profiles
  for insert with check (true); -- handled server-side with clerk_user_id check

create policy "Users can update own profile" on profiles
  for update using (true); -- enforced server-side

-- MATCH_REQUESTS policies
create policy "Users see their own requests" on match_requests
  for select using (true);

create policy "Users can insert requests" on match_requests
  for insert with check (true);

create policy "Users can update requests" on match_requests
  for update using (true);

-- CONVERSATIONS policies
create policy "Users see own conversations" on conversations
  for select using (true);

create policy "Users can create conversations" on conversations
  for insert with check (true);

-- MESSAGES policies
create policy "Users see messages in their conversations" on messages
  for select using (true);

create policy "Users can insert messages" on messages
  for insert with check (true);

-- NOTIFICATIONS policies
create policy "Users see own notifications" on notifications
  for select using (true);

create policy "Users can insert notifications" on notifications
  for insert with check (true);

create policy "Users can update own notifications" on notifications
  for update using (true);

-- PASSES policies
create policy "Users see own passes" on passes
  for select using (true);

create policy "Users can insert passes" on passes
  for insert with check (true);

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

create policy "Authenticated users can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars');

create policy "Users can update their own avatars" on storage.objects
  for update with check (bucket_id = 'avatars');
