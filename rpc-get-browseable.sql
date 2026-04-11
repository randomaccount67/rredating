-- rredating: Browse RPC (duplicate of supabase-schema.sql)
-- Prefer applying the full supabase-schema.sql in the Supabase SQL Editor so
-- this function stays in sync. This file is kept for one-off deploys.

CREATE OR REPLACE FUNCTION public.get_browseable_profiles(viewer_id UUID)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_browseable_profiles(uuid) TO anon, authenticated, service_role;
