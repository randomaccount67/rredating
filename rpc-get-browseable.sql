CREATE OR REPLACE FUNCTION public.get_browseable_profiles(viewer_id UUID)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET plan_cache_mode = force_generic_plan
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM profiles p
  WHERE
    p.id != viewer_id
    AND p.confirmed_18 = true
    AND p.is_banned = false
    AND p.avatar_url IS NOT NULL
    AND p.avatar_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM passes
      WHERE from_user = viewer_id AND to_user = p.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM match_requests
      WHERE status IN ('pending', 'matched')
        AND (
          (from_user = viewer_id AND to_user = p.id)
          OR
          (from_user = p.id AND to_user = viewer_id)
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = viewer_id AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = viewer_id)
    )
  ORDER BY p.created_at DESC
  LIMIT 10000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_browseable_profiles(uuid) TO anon, authenticated, service_role;
