-- Chat analysis feature columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chat_analysis_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_seen_analysis_announcement boolean DEFAULT false;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS analysis_rating text,
  ADD COLUMN IF NOT EXISTS analysis_reason text;
