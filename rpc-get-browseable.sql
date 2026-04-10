-- rredating: Stability Fixes
-- Run this script in your Supabase SQL Editor to deploy the Browse RPC function.
-- This mitigates the HTTP 414 Request-URI Too Long crash when generating the exclusion list.

CREATE OR REPLACE FUNCTION get_browseable_profiles(viewer_id UUID)
RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM profiles p
  WHERE p.confirmed_18 = true 
    AND p.is_banned = false
    AND p.id != viewer_id
    AND p.id NOT IN (
      SELECT to_user FROM passes WHERE from_user = viewer_id
    )
    AND p.id NOT IN (
      SELECT to_user FROM match_requests WHERE from_user = viewer_id
    )
    AND p.id NOT IN (
      SELECT blocked_id FROM blocked_users WHERE blocker_id = viewer_id
    )
    AND p.id NOT IN (
      SELECT blocker_id FROM blocked_users WHERE blocked_id = viewer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
