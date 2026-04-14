import { db } from './db.js';
import { badRequest, forbidden } from '../utils/errors.js';
import { ADMIN_USER_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import { securityLog } from '../utils/logger.js';
import type { Profile } from '../types/index.js';

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listUsers(page = 0, search = '') {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Apply filter BEFORE .range() so the exact count reflects the filtered set.
  let query = db
    .from('profiles')
    .select(ADMIN_USER_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    if (UUID_RE.test(search)) {
      // Search by profile UUID
      query = query.eq('id', search);
    } else {
      // Partial match on riot_id (case-insensitive)
      query = query.ilike('riot_id', `%${search}%`);
    }
  }

  const { data, count } = await query.range(from, to);
  const total = count ?? 0;

  return {
    users: data || [],
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function listReports() {
  const { data } = await db
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_id_fkey(id, riot_id, riot_tag), reported:profiles!reports_reported_id_fkey(id, riot_id, riot_tag)')
    .order('created_at', { ascending: false });
  return { reports: data || [] };
}

export async function markReportReviewed(reportId: string) {
  if (!reportId) throw badRequest('report_id is required');
  // H5 fix: Validate UUID format before using in query
  const parsed = uuidSchema.safeParse(reportId);
  if (!parsed.success) throw badRequest('Invalid report ID format');

  await db.from('reports').update({ reviewed: true }).eq('id', reportId);
  return { success: true };
}

export async function toggleVerified(adminProfile: Profile, targetId: string, verify: boolean) {
  console.log(`[admin.toggleVerified] called: targetId=${targetId}, verify=${verify}, adminId=${adminProfile.id}`);
  if (!targetId) {
    console.log('[admin.toggleVerified] ERROR: missing profile_id');
    throw badRequest('profile_id is required');
  }
  const parsed = uuidSchema.safeParse(targetId);
  if (!parsed.success) {
    console.log(`[admin.toggleVerified] ERROR: invalid UUID format for targetId=${targetId}`);
    throw badRequest('Invalid profile ID format');
  }

  const { error } = await db.from('profiles').update({ is_verified: verify }).eq('id', targetId);
  if (error) {
    console.error('[admin.toggleVerified] DB error:', error);
    throw new Error(`Failed to update verification status: ${error.message}`);
  }
  console.log(`[admin.toggleVerified] success: set is_verified=${verify} on profile ${targetId}`);
  securityLog.adminAction(adminProfile.id, verify ? 'verify_user' : 'unverify_user', targetId);

  return { success: true };
}

export async function toggleBan(adminProfile: Profile, targetId: string, ban: boolean) {
  if (!targetId) throw badRequest('profile_id is required');
  // H5 fix: Validate UUID format
  const parsed = uuidSchema.safeParse(targetId);
  if (!parsed.success) throw badRequest('Invalid profile ID format');

  if (targetId === adminProfile.id) throw badRequest('Cannot ban yourself');

  // Check target is not also an admin
  const { data: target } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', targetId)
    .single();
  if (target?.is_admin) throw forbidden('Cannot ban another admin');

  await db.from('profiles').update({ is_banned: ban }).eq('id', targetId);

  // M6: Audit log for ban actions
  securityLog.banToggled(adminProfile.id, targetId, ban);

  return { success: true };
}

export async function viewConversation(userA: string, userB: string) {
  if (!userA || !userB) throw badRequest('user_a and user_b are required');
  const parsedA = uuidSchema.safeParse(userA);
  const parsedB = uuidSchema.safeParse(userB);
  if (!parsedA.success || !parsedB.success) throw badRequest('Invalid user ID format');

  // ── Path 1: two simple equality queries instead of a nested or() ──────────
  // Avoids PostgREST nested AND/OR syntax which can silently return no rows.
  const [convABRes, convBARes] = await Promise.all([
    db.from('conversations').select('id').eq('user_a', userA).eq('user_b', userB),
    db.from('conversations').select('id').eq('user_a', userB).eq('user_b', userA),
  ]);

  const convIdSet = new Set<string>();
  convABRes.data?.forEach((c: any) => convIdSet.add(c.id));
  convBARes.data?.forEach((c: any) => convIdSet.add(c.id));

  // ── Path 2: message-table fallback ───────────────────────────────────────
  // Works even when the conversation row was deleted after an unmatch, as long
  // as the messages themselves still exist.
  const { data: msgRows } = await db
    .from('messages')
    .select('conversation_id, sender_id')
    .in('sender_id', [userA, userB]);

  if (msgRows && msgRows.length > 0) {
    const aIds = new Set<string>(
      msgRows.filter((m: any) => m.sender_id === userA).map((m: any) => m.conversation_id),
    );
    const bIds = new Set<string>(
      msgRows.filter((m: any) => m.sender_id === userB).map((m: any) => m.conversation_id),
    );
    // Include a conv ID if both users sent messages in it, or it was already
    // found via the conversations table (one-sided message is still valid).
    for (const id of aIds) {
      if (bIds.has(id) || convIdSet.has(id)) convIdSet.add(id);
    }
    for (const id of bIds) {
      if (aIds.has(id) || convIdSet.has(id)) convIdSet.add(id);
    }
  }

  if (convIdSet.size === 0) return { messages: [], found: false };

  // ── Fetch all messages, ordered ascending so the log reads chronologically ─
  const { data: messages } = await db
    .from('messages')
    .select('id, sender_id, content, created_at')
    .in('conversation_id', [...convIdSet])
    .in('sender_id', [userA, userB])
    .order('created_at', { ascending: true });

  return { messages: messages || [], found: (messages?.length ?? 0) > 0 };
}
