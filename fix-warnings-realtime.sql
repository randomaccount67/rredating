-- ============================================================
-- FIX: Bug 2 — Realtime P0001 "invalid column for filter user_id"
-- Run this in the Supabase SQL editor.
-- ============================================================
-- The `warnings` table is used throughout backend/src/services/warnings.service.ts
-- and frontend/src/components/shared/WarningGate.tsx but is not defined in any
-- tracked SQL file in this repo (unlike every other table, which lives in
-- supabase-schema.sql). That means it was created out-of-band directly in the
-- Supabase dashboard at some point, so its live column names could not be
-- verified by reading the repo.
--
-- WarningGate.tsx subscribes with:
--   .on('postgres_changes', { table: 'warnings', filter: `user_id=eq.${myProfileId}` })
-- If the live `warnings` table does not actually have a `user_id` column,
-- Realtime raises P0001 at subscribe time and the channel never establishes —
-- which matches the reported symptom exactly (silently does nothing).
--
-- This migration is idempotent and safe to run whether the table already has
-- the right shape, is missing just the user_id column, or doesn't exist yet.
-- ============================================================

-- 1. Ensure the table exists with the shape the backend code expects.
--    (No-op if it already exists — CREATE TABLE IF NOT EXISTS does not alter
--    an existing table's columns.)
create table if not exists warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  admin_id uuid references profiles(id) on delete set null,
  message text not null,
  acknowledged boolean default false,
  created_at timestamptz default now()
);

-- 2. Safety net: if the table already existed under a different column layout,
--    make sure `user_id` specifically is present (the column the realtime
--    filter and every backend query reference).
--    !! If this ADD COLUMN actually fires (i.e. the column was truly missing),
--    any existing rows will have user_id = NULL and will need a manual
--    backfill from whatever the old column was — inspect the table first.
alter table warnings add column if not exists user_id uuid references profiles(id) on delete cascade;

create index if not exists idx_warnings_user_id on warnings(user_id);
create index if not exists idx_warnings_admin_id on warnings(admin_id);

-- 3. RLS — warnings was never given policies in supabase-schema.sql either.
--    Backend uses the service-role key (bypasses RLS) for all warnings
--    operations, so this only matters if the anon key ever queries it directly.
alter table warnings enable row level security;

drop policy if exists "Users see own warnings" on warnings;
create policy "Users see own warnings" on warnings
  for select using (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()::text)
  );

drop policy if exists "Only service role can insert warnings" on warnings;
create policy "Only service role can insert warnings" on warnings
  for insert with check (false);

drop policy if exists "Only service role can update warnings" on warnings;
create policy "Only service role can update warnings" on warnings
  for update using (false);

-- 4. Add to the realtime publication — without this, the postgres_changes
--    subscription has nothing to attach to even once the column is correct.
--    NOTE: this errors ("relation already member of publication") if warnings
--    is already published — safe to ignore / skip this line in that case.
alter publication supabase_realtime add table warnings;
