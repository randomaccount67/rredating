import { db } from './db.js';
import { AppError, badRequest, notFound } from '../utils/errors.js';
import { BROWSE_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import { securityLog } from '../utils/logger.js';
import type { Profile } from '../types/index.js';

/**
 * Region / rank / gender / mic filters applied in-process.
 * PostgREST often does not apply `.eq()` / `.range()` correctly when chained after
 * `.rpc()` (filters or pagination can be dropped), which produced empty Browse.
 */
function hasBrowseQueryFilters(query: Record<string, string>): boolean {
  return !!(
    query.region ||
    (query.rank_tier && query.rank_tier !== 'Any') ||
    query.role ||
    query.gender ||
    query.mic_only === '1'
  );
}

function filterBrowseCandidates(rows: Profile[], query: Record<string, string>): Profile[] {
  return rows.filter(p => {
    if (query.region && p.region !== query.region) return false;
    if (query.role && p.role !== query.role) return false;
    if (query.mic_only === '1' && !p.mic_on) return false;
    if (query.rank_tier && query.rank_tier !== 'Any') {
      const prefix = query.rank_tier;
      const rank = p.current_rank;
      if (!rank || !rank.toLowerCase().startsWith(prefix.toLowerCase())) return false;
    }
    if (query.gender) {
      if (query.gender === 'Male' || query.gender === 'Female') {
        if (p.gender !== query.gender) return false;
      } else {
        if (p.gender === 'Male' || p.gender === 'Female' || p.gender == null) return false;
      }
    }
    return true;
  });
}

/**
 * Same rules as get_browseable_profiles SQL, when the RPC is missing or errors.
 */
async function browseFromProfilesTable(profile: Profile) {
  const [passesRes, reqRes, blockOutRes, blockInRes] = await Promise.all([
    db.from('passes').select('to_user').eq('from_user', profile.id),
    db.from('match_requests').select('to_user').eq('from_user', profile.id),
    db.from('blocked_users').select('blocked_id').eq('blocker_id', profile.id),
    db.from('blocked_users').select('blocker_id').eq('blocked_id', profile.id),
  ]);

  const prefetchErr = passesRes.error || reqRes.error || blockOutRes.error || blockInRes.error;
  if (prefetchErr) {
    return { data: null as Profile[] | null, error: prefetchErr };
  }

  const exclude = new Set<string>();
  passesRes.data?.forEach(r => exclude.add(r.to_user));
  reqRes.data?.forEach(r => exclude.add(r.to_user));
  blockOutRes.data?.forEach(r => exclude.add(r.blocked_id));
  blockInRes.data?.forEach(r => exclude.add(r.blocker_id));

  let q = db
    .from('profiles')
    .select(BROWSE_COLUMNS)
    .eq('confirmed_18', true)
    .eq('is_banned', false)
    .neq('id', profile.id);

  if (exclude.size > 0) {
    q = q.not('id', 'in', `(${Array.from(exclude).join(',')})`);
  }

  return await q.order('created_at', { ascending: false }).limit(3000);
}

async function loadBrowseCandidates(profile: Profile): Promise<Profile[]> {
  const { data, error } = await db
    .rpc('get_browseable_profiles', { viewer_id: profile.id })
    .select(BROWSE_COLUMNS);

  if (!error && data) {
    return data as Profile[];
  }

  if (error) {
    securityLog.browseRpcFailed(profile.id, error.message, error.code);
  }

  const fb = await browseFromProfilesTable(profile);
  if (fb.error || !fb.data) return [];
  return fb.data as Profile[];
}

export async function browse(profile: Profile, query: Record<string, string>) {
  const page = parseInt(query.page || '0', 10);
  const limit = Math.min(parseInt(query.limit || '12', 10), 24);
  const offset = page * limit;

  const candidates = filterBrowseCandidates(await loadBrowseCandidates(profile), query);
  const windowRows = candidates.slice(offset, offset + limit * 2);

  if (windowRows.length === 0) {
    return {
      profiles: [],
      hasMore: false,
      requestStatuses: {},
      poolSize: candidates.length,
      filtersActive: hasBrowseQueryFilters(query),
    };
  }

  const shuffled = [...windowRows].sort(() => Math.random() - 0.5).slice(0, limit);

  const ids = shuffled.map(p => p.id);
  const { data: statuses } = await db
    .from('match_requests')
    .select('to_user, status')
    .eq('from_user', profile.id)
    .in('to_user', ids);

  const requestStatuses: Record<string, string> = {};
  statuses?.forEach(s => { requestStatuses[s.to_user] = s.status; });

  return {
    profiles: shuffled,
    hasMore: windowRows.length > limit || offset + limit * 2 < candidates.length,
    requestStatuses,
    poolSize: candidates.length,
    filtersActive: hasBrowseQueryFilters(query),
  };
}

export async function sendRequest(profile: Profile, toProfileId: string) {
  if (!toProfileId) throw badRequest('to_user_profile_id is required');
  // H5 fix: Validate UUID format
  if (!uuidSchema.safeParse(toProfileId).success) throw badRequest('Invalid profile ID format');

  // Verify target exists and not banned
  const { data: target } = await db
    .from('profiles')
    .select('id, is_banned')
    .eq('id', toProfileId)
    .single();
  if (!target) throw notFound('User not found');
  if (target.is_banned) throw badRequest('User is not available');

  // Check for reverse (mutual match detection)
  const { data: reverse } = await db
    .from('match_requests')
    .select('id, status')
    .eq('from_user', toProfileId)
    .eq('to_user', profile.id)
    .single();

  if (reverse && reverse.status === 'pending') {
    // Mutual match!
    await db.from('match_requests').update({ status: 'matched' }).eq('id', reverse.id);

    const { data: conv } = await db
      .from('conversations')
      .insert({ user_a: profile.id, user_b: toProfileId })
      .select('id')
      .single();

    // Notify both users
    await db.from('notifications').insert([
      { user_id: profile.id, type: 'matched', related_user: toProfileId },
      { user_id: toProfileId, type: 'matched', related_user: profile.id },
    ]);

    return { status: 'matched', conversation_id: conv?.id };
  }

  // Insert new pending request
  const { error } = await db
    .from('match_requests')
    .insert({ from_user: profile.id, to_user: toProfileId, status: 'pending' });

  if (error?.code === '23505') return { status: 'pending' };
  if (error) throw new AppError(500, error.message);

  // Notify target
  await db.from('notifications').insert({
    user_id: toProfileId,
    type: 'match_request',
    related_user: profile.id,
  });

  return { status: 'pending' };
}

export async function respondToRequest(profile: Profile, requestId: string, action: string) {
  if (!requestId || !action) throw badRequest('request_id and action are required');
  // H5 fix: Validate UUID format
  if (!uuidSchema.safeParse(requestId).success) throw badRequest('Invalid request ID format');
  if (action !== 'accept' && action !== 'decline') throw badRequest('action must be accept or decline');

  const { data: request } = await db
    .from('match_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) throw notFound('Request not found');
  if (request.to_user !== profile.id) throw badRequest('Not your request');

  if (action === 'decline') {
    await db.from('match_requests').update({ status: 'declined' }).eq('id', requestId);
    return { status: 'declined' };
  }

  // Accept → match
  await db.from('match_requests').update({ status: 'matched' }).eq('id', requestId);

  const { data: conv } = await db
    .from('conversations')
    .insert({ user_a: request.from_user, user_b: request.to_user })
    .select('id')
    .single();

  await db.from('notifications').insert([
    { user_id: request.from_user, type: 'matched', related_user: request.to_user },
    { user_id: request.to_user, type: 'matched', related_user: request.from_user },
  ]);

  return { status: 'matched', conversation_id: conv?.id };
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
