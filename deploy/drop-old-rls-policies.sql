-- ============================================================
-- RLS MIGRATION — Drop old wide-open policies, apply strict ones
-- Run this in the Supabase SQL Editor BEFORE applying the new schema
-- ============================================================

-- ─── Drop old PROFILES policies ────────────────────────────────
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ─── Drop old MATCH_REQUESTS policies ──────────────────────────
DROP POLICY IF EXISTS "Users see their own requests" ON match_requests;
DROP POLICY IF EXISTS "Users can insert requests" ON match_requests;
DROP POLICY IF EXISTS "Users can update requests" ON match_requests;

-- ─── Drop old CONVERSATIONS policies ──────────────────────────
DROP POLICY IF EXISTS "Users see own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- ─── Drop old MESSAGES policies ────────────────────────────────
DROP POLICY IF EXISTS "Users see messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

-- ─── Drop old NOTIFICATIONS policies ──────────────────────────
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- ─── Drop old PASSES policies ──────────────────────────────────
DROP POLICY IF EXISTS "Users see own passes" ON passes;
DROP POLICY IF EXISTS "Users can insert passes" ON passes;

-- ─── Drop old CONVERSATION_VIEWERS policies ────────────────────
DROP POLICY IF EXISTS "Users can manage their own viewer entries" ON conversation_viewers;

-- ─── Drop old STORAGE policies ─────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

-- ============================================================
-- Now run the new policies from supabase-schema.sql (lines 98+)
-- ============================================================
