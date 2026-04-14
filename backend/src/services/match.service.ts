import { db } from './db.js';
import { AppError, badRequest, notFound } from '../utils/errors.js';
import { BROWSE_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import { securityLog } from '../utils/logger.js';
import { broadcast } from '../utils/broadcast.js';
import type { Profile } from '../types/index.js';

/** Hard server-side cap on profiles returned per browse request. */
const MAX_BROWSE_LIMIT = 50;

/**
 * Throws a generic 403 for any precondition failure in sendRequest.
 * A single opaque error prevents the caller from distinguishing which check
 * failed (e.g. "is this user blocked?" vs "does this user exist?").
 */
function requestNotAllowed(): AppError {
  return new AppError(403, 'You cannot send a request to this user.', 'REQUEST_NOT_ALLOWED');
}

/**
 * Region / rank / gender / mic filters applied in-process.
 * PostgREST often does not apply `.eq()` / `.range()` correctly when chained after
 * `.rpc()` (filters or pagination can be dropped), which produced empty Browse.
 */
function hasBrowseQueryFilters(query: Record<string, string>): boolean {
  const ageMin = query.age_min ? parseInt(query.age_min, 10) : 18;
  const ageMax = query.age_max ? parseInt(query.age_max, 10) : 99;
  return !!(
    query.region ||
    (query.rank_tier && query.rank_tier !== 'Any') ||
    query.role ||
    query.gender ||
    query.mic_only === '1' ||
    ageMin > 18 ||
    ageMax < 99
  );
}

function filterBrowseCandidates(rows: Profile[], query: Record<string, string>): Profile[] {
  const ageMin = query.age_min ? parseInt(query.age_min, 10) : 18;
  const ageMax = query.age_max ? parseInt(query.age_max, 10) : 99;
  const filteringAge = ageMin > 18 || ageMax < 99;

  return rows.filter(p => {
    if (query.region && p.region !== query.region) return false;
    if (query.role && p.role !== query.role) return false;
    if (query.mic_only === '1' && !p.mic_on) return false;
    if (query.rank_tier && query.rank_tier !== 'Any') {
      const prefix = query.rank_tier;
      const rank = p.current_rank;
      if (prefix === 'Unranked') {
        if (rank !== 'Unranked' && rank !== null) return false;
      } else {
        if (!rank || !rank.toLowerCase().startsWith(prefix.toLowerCase())) return false;
      }
    }
    if (query.gender) {
      if (query.gender === 'Male' || query.gender === 'Female') {
        if (p.gender !== query.gender) return false;
      } else {
        if (p.gender === 'Male' || p.gender === 'Female' || p.gender == null) return false;
      }
    }
    if (filteringAge) {
      if (p.age == null || p.age < ageMin || p.age > ageMax) return false;
    }
    return true;
  });
}

/**
 * Same rules as get_browseable_profiles SQL. Exclusions are applied in memory so we
 * never rely on PostgREST `not.in` for UUID lists (often breaks or returns empty).
 *
 * When includePassed=true the passes table is still fetched but not applied to the
 * exclude set — the user explicitly requested to see profiles they passed on.
 */
async function browseFromProfilesTable(profile: Profile, includePassed = false) {
  const [passesRes, reqOutRes, reqInRes, blockOutRes, blockInRes] = await Promise.all([
    db.from('passes').select('to_user').eq('from_user', profile.id),
    db.from('match_requests').select('to_user').eq('from_user', profile.id),
    // Also exclude users who sent ME requests (pending or matched) — they've already interacted
    db.from('match_requests').select('from_user').eq('to_user', profile.id),
    db.from('blocked_users').select('blocked_id').eq('blocker_id', profile.id),
    db.from('blocked_users').select('blocker_id').eq('blocked_id', profile.id),
  ]);

  const prefetchErr = passesRes.error || reqOutRes.error || reqInRes.error || blockOutRes.error || blockInRes.error;
  if (prefetchErr) {
    return { data: null as Profile[] | null, error: prefetchErr };
  }

  const exclude = new Set<string>();
  // Only exclude passes when not in includePassed mode
  if (!includePassed) {
    passesRes.data?.forEach(r => exclude.add(r.to_user));
  }
  reqOutRes.data?.forEach(r => exclude.add(r.to_user));
  reqInRes.data?.forEach(r => exclude.add(r.from_user));
  blockOutRes.data?.forEach(r => exclude.add(r.blocked_id));
  blockInRes.data?.forEach(r => exclude.add(r.blocker_id));

  const { data: rows, error } = await db
    .from('profiles')
    .select(BROWSE_COLUMNS)
    .eq('confirmed_18', true)
    .eq('is_banned', false)
    .not('avatar_url', 'is', null)
    .neq('avatar_url', '')
    .neq('id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    return { data: null, error };
  }

  const list = (rows as Profile[] | null) ?? [];
  const filtered = list.filter(p => !exclude.has(p.id));
  return { data: filtered.slice(0, 3000), error: null };
}

async function loadBrowseCandidates(profile: Profile, includePassed = false): Promise<Profile[]> {
  // When includePassed=true, skip the RPC (which always excludes passes internally) and
  // go straight to the TS path where we can honour the includePassed flag.
  if (!includePassed) {
    const rpc = await db
      .rpc('get_browseable_profiles', { viewer_id: profile.id })
      .select(BROWSE_COLUMNS);

    const fromRpc = (!rpc.error && rpc.data ? (rpc.data as Profile[]) : [])
      .filter(p => p.avatar_url);

    if (rpc.error) {
      securityLog.browseRpcFailed(profile.id, rpc.error.message, rpc.error.code);
    }

    if (fromRpc.length > 0) {
      return fromRpc;
    }
  }

  // RPC missing/errored/skipped — use TS fallback with the appropriate passes flag.
  const fb = await browseFromProfilesTable(profile, includePassed);
  if (fb.error || !fb.data) return [];
  return fb.data as Profile[];
}

export async function browse(profile: Profile, query: Record<string, string>) {
  const parsedLimit = Number(query.limit);
  const limit = Math.min(Number.isNaN(parsedLimit) ? 20 : parsedLimit, MAX_BROWSE_LIMIT);
  const includePassed = query.includePassed === 'true';

  const rawCandidates = filterBrowseCandidates(await loadBrowseCandidates(profile, includePassed), query);

  // Deduplicate by ID (RPC + TS-fallback paths may overlap)
  const seenIds = new Set<string>();
  const candidates = rawCandidates.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  if (candidates.length === 0) {
    return {
      profiles: [],
      hasMore: false,
      requestStatuses: {},
      poolSize: 0,
      filtersActive: hasBrowseQueryFilters(query),
    };
  }

  // Weighted random ordering: supporters get +2 boost, verified +1.
  // Sorting the whole pool means every refresh produces a different order while
  // supporters and verified users still float toward the top on average.
  const scored = candidates.map(p => ({
    profile: p,
    score: Math.random() + (p.is_supporter ? 2 : 0) + (p.is_verified ? 1 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, limit).map(s => s.profile);

  const ids = selected.map(p => p.id);
  const { data: statuses } = await db
    .from('match_requests')
    .select('to_user, status')
    .eq('from_user', profile.id)
    .in('to_user', ids);

  const requestStatuses: Record<string, string> = {};
  statuses?.forEach(s => { requestStatuses[s.to_user] = s.status; });

  return {
    profiles: selected,
    hasMore: candidates.length > limit,
    requestStatuses,
    poolSize: candidates.length,
    filtersActive: hasBrowseQueryFilters(query),
  };
}

export async function sendRequest(profile: Profile, toProfileId: string) {
  if (!toProfileId) throw badRequest('to_user_profile_id is required');
  if (!uuidSchema.safeParse(toProfileId).success) throw badRequest('Invalid profile ID format');

  // Synchronous guards — no DB needed
  if (toProfileId === profile.id) throw requestNotAllowed();
  if (!profile.avatar_url) throw new AppError(403, 'A profile picture is required to use this feature.', 'PROFILE_INCOMPLETE');

  // Batch all prerequisite DB checks in a single parallel round-trip
  const [targetRes, blockOutRes, blockInRes, outgoingRes, incomingRes] = await Promise.all([
    // 1. Target must exist and not be banned
    db.from('profiles').select('id, is_banned').eq('id', toProfileId).maybeSingle(),
    // 2. Current user must not have blocked target
    db.from('blocked_users').select('id').eq('blocker_id', profile.id).eq('blocked_id', toProfileId).maybeSingle(),
    // 3. Target must not have blocked current user
    db.from('blocked_users').select('id').eq('blocker_id', toProfileId).eq('blocked_id', profile.id).maybeSingle(),
    // 4. No active outgoing request from us to them
    db.from('match_requests').select('id, status').eq('from_user', profile.id).eq('to_user', toProfileId).in('status', ['pending', 'matched']).maybeSingle(),
    // 5. No active incoming request from them to us (mutual match path)
    db.from('match_requests').select('id, status').eq('from_user', toProfileId).eq('to_user', profile.id).in('status', ['pending', 'matched']).maybeSingle(),
  ]);

  // Evaluate checks — all use the same opaque error so callers learn nothing specific
  if (!targetRes.data || targetRes.data.is_banned) throw requestNotAllowed();
  if (blockOutRes.data || blockInRes.data) throw requestNotAllowed();

  // Idempotent: we already have an active outgoing request
  if (outgoingRes.data) return { status: outgoingRes.data.status as string };

  // Idempotent: already matched via their request
  if (incomingRes.data?.status === 'matched') return { status: 'matched' };

  // Mutual match: they have a pending request to us → atomically accept it
  if (incomingRes.data?.status === 'pending') {
    const reverse = incomingRes.data;

    // Conditional update: only transitions if the row is STILL pending (race guard)
    const { data: matchedRows } = await db
      .from('match_requests')
      .update({ status: 'matched' })
      .eq('id', reverse.id)
      .eq('status', 'pending')
      .select('id');

    if (!matchedRows || matchedRows.length === 0) {
      // Racing request already processed this — idempotent
      return { status: 'matched' };
    }

    // Check for existing conversation before creating a new one (prevents message loss)
    const { data: existingConv } = await db
      .from('conversations')
      .select('id')
      .or(`and(user_a.eq.${profile.id},user_b.eq.${toProfileId}),and(user_a.eq.${toProfileId},user_b.eq.${profile.id})`)
      .maybeSingle();

    let convId: string | undefined;
    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await db
        .from('conversations')
        .insert({ user_a: profile.id, user_b: toProfileId })
        .select('id')
        .single();
      convId = newConv?.id;
    }

    await db.from('notifications').insert([
      { user_id: profile.id, type: 'matched', related_user: toProfileId },
      { user_id: toProfileId, type: 'matched', related_user: profile.id },
    ]);

    await Promise.all([
      broadcast(`notification:${profile.id}`, 'new_notification', { type: 'matched', related_user: toProfileId }),
      broadcast(`notification:${toProfileId}`, 'new_notification', { type: 'matched', related_user: profile.id }),
      broadcast(`inbox:${profile.id}`, 'new_message', { conversation_id: convId }),
      broadcast(`inbox:${toProfileId}`, 'new_message', { conversation_id: convId }),
    ]);

    return { status: 'matched', conversation_id: convId };
  }

  // No existing request in either direction — insert new pending request
  const { data: newRequest, error } = await db
    .from('match_requests')
    .insert({ from_user: profile.id, to_user: toProfileId, status: 'pending' })
    .select()
    .single();

  if (error?.code === '23505') return { status: 'pending' }; // DB-level unique constraint safety net
  if (error) throw new AppError(500, error.message);

  await db.from('notifications').insert({
    user_id: toProfileId,
    type: 'match_request',
    related_user: profile.id,
  });

  await Promise.all([
    broadcast(`match_requests:${toProfileId}`, 'new_request', {
      request: newRequest,
      sender: { id: profile.id, riot_id: profile.riot_id, riot_tag: profile.riot_tag, avatar_url: profile.avatar_url },
    }),
    broadcast(`notification:${toProfileId}`, 'new_notification', { type: 'match_request', related_user: profile.id }),
  ]);

  return { status: 'pending' };
}

export async function respondToRequest(profile: Profile, requestId: string, action: string) {
  if (!requestId || !action) throw badRequest('request_id and action are required');
  if (!uuidSchema.safeParse(requestId).success) throw badRequest('Invalid request ID format');
  if (action !== 'accept' && action !== 'decline') throw badRequest('action must be accept or decline');

  // Read once to establish existence and ownership — errors here are correct 404/400
  const { data: request } = await db
    .from('match_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) throw notFound('Request not found');
  if (request.to_user !== profile.id) throw badRequest('Not your request');

  if (action === 'decline') {
    // Atomic conditional update: only transitions pending → declined.
    // If the row is already declined/matched (parallel requests), the update
    // affects 0 rows and we return idempotently without side-effects.
    await db
      .from('match_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)
      .eq('to_user', profile.id)
      .eq('status', 'pending');
    return { status: 'declined' };
  }

  // Accept — atomic conditional update: only transitions pending → matched.
  // The .eq('status', 'pending') filter means parallel accepts race and only ONE
  // update actually changes a row. The losers get 0 rows back and short-circuit
  // without creating duplicate notifications.
  const { data: matched } = await db
    .from('match_requests')
    .update({ status: 'matched' })
    .eq('id', requestId)
    .eq('to_user', profile.id)
    .eq('status', 'pending')
    .select('id');

  if (!matched || matched.length === 0) {
    // Already accepted by a racing request — idempotent success, no notification
    return { status: 'matched' };
  }

  // Exactly one winner reaches here — create conversation and notify
  const { data: existingConv } = await db
    .from('conversations')
    .select('id')
    .or(`and(user_a.eq.${request.from_user},user_b.eq.${request.to_user}),and(user_a.eq.${request.to_user},user_b.eq.${request.from_user})`)
    .maybeSingle();

  let convId: string | undefined;
  if (existingConv) {
    convId = existingConv.id;
  } else {
    const { data: newConv } = await db
      .from('conversations')
      .insert({ user_a: request.from_user, user_b: request.to_user })
      .select('id')
      .single();
    convId = newConv?.id;
  }

  await db.from('notifications').insert([
    { user_id: request.from_user, type: 'matched', related_user: request.to_user },
    { user_id: request.to_user, type: 'matched', related_user: request.from_user },
  ]);

  await Promise.all([
    broadcast(`notification:${request.from_user}`, 'new_notification', { type: 'matched', related_user: request.to_user }),
    broadcast(`notification:${request.to_user}`, 'new_notification', { type: 'matched', related_user: request.from_user }),
    broadcast(`inbox:${request.from_user}`, 'new_message', { conversation_id: convId }),
    broadcast(`inbox:${request.to_user}`, 'new_message', { conversation_id: convId }),
  ]);

  return { status: 'matched', conversation_id: convId };
}

export async function pass(profile: Profile, toProfileId: string) {
  if (!toProfileId) throw badRequest('to_user_profile_id is required');
  // H5 fix: Validate UUID format
  if (!uuidSchema.safeParse(toProfileId).success) throw badRequest('Invalid profile ID format');
  await db.from('passes').upsert(
    { from_user: profile.id, to_user: toProfileId },
    { ignoreDuplicates: true }
  );
  return { success: true };
}

export async function deletePass(profile: Profile, toProfileId: string) {
  if (!toProfileId) throw badRequest('to_user_profile_id is required');
  if (!uuidSchema.safeParse(toProfileId).success) throw badRequest('Invalid profile ID format');
  await db
    .from('passes')
    .delete()
    .eq('from_user', profile.id)
    .eq('to_user', toProfileId);
  return { success: true };
}

export async function unmatch(profile: Profile, otherProfileId: string) {
  if (!otherProfileId) throw badRequest('other_profile_id is required');
  if (!uuidSchema.safeParse(otherProfileId).success) throw badRequest('Invalid profile ID format');
  if (otherProfileId === profile.id) throw badRequest('Cannot unmatch yourself');

  // Remove match request(s) in either direction
  await db
    .from('match_requests')
    .delete()
    .or(`and(from_user.eq.${profile.id},to_user.eq.${otherProfileId}),and(from_user.eq.${otherProfileId},to_user.eq.${profile.id})`);

  // Remove conversation record — messages are preserved for admin review
  await db
    .from('conversations')
    .delete()
    .or(`and(user_a.eq.${profile.id},user_b.eq.${otherProfileId}),and(user_a.eq.${otherProfileId},user_b.eq.${profile.id})`);

  return { success: true };
}
