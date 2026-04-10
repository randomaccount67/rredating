import { db } from './db.js';
import { AppError, badRequest, notFound } from '../utils/errors.js';
import { BROWSE_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import type { Profile } from '../types/index.js';

export async function browse(profile: Profile, query: Record<string, string>) {
  const page = parseInt(query.page || '0', 10);
  const limit = Math.min(parseInt(query.limit || '12', 10), 24);
  const offset = page * limit;

  // Build query using RPC to avoid 414 Request-URI Too Long
  let q = db
    .rpc('get_browseable_profiles', { viewer_id: profile.id })
    .select(BROWSE_COLUMNS)
    .range(offset, offset + (limit * 2) - 1);

  // Apply filters
  if (query.region) q = q.eq('region', query.region);
  if (query.role) q = q.eq('role', query.role);
  if (query.mic_only === '1') q = q.eq('mic_on', true);
  if (query.rank_tier && query.rank_tier !== 'Any') {
    q = q.ilike('current_rank', `${query.rank_tier}%`);
  }
  if (query.gender) {
    if (query.gender === 'Male' || query.gender === 'Female') {
      q = q.eq('gender', query.gender);
    } else {
      q = q.not('gender', 'in', '("Male","Female")').not('gender', 'is', null);
    }
  }

  const { data, error } = await q;
  const rows = data as Profile[] | null;
  if (error || !rows || rows.length === 0) return { profiles: [], hasMore: false, requestStatuses: {} };

  // Shuffle and slice
  const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, limit);

  // Fetch request statuses
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
    hasMore: rows.length > limit,
    requestStatuses,
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
