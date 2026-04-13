import { db } from './db.js';
import { badRequest, forbidden } from '../utils/errors.js';
import { ADMIN_USER_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import { securityLog } from '../utils/logger.js';
import type { Profile } from '../types/index.js';

export async function listUsers() {
  const { data } = await db
    .from('profiles')
    .select(ADMIN_USER_COLUMNS)
    .order('created_at', { ascending: false });
  return { users: data || [] };
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
  // H5 fix: Validate UUID format before interpolating into filter string
  const parsedA = uuidSchema.safeParse(userA);
  const parsedB = uuidSchema.safeParse(userB);
  if (!parsedA.success || !parsedB.success) throw badRequest('Invalid user ID format');

  // ── Path 1: look up via the conversations table ───────────────────────────
  // Covers the normal case and handles duplicate conversation records from old bugs.
  const { data: convRows } = await db
    .from('conversations')
    .select('id')
    .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`);

  const convIdSet = new Set<string>(convRows?.map((c: any) => c.id) ?? []);

  // ── Path 2: supplemental lookup via the messages table ────────────────────
  // If the conversation record was deleted (e.g. old block behaviour) or is
  // otherwise missing, we can still recover shared conversation IDs by finding
  // the intersection of IDs where userA sent a message AND userB sent a message.
  // This works independently of the conversations table.
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
    // Add conversation IDs shared between both users into the main set
    for (const id of aIds) {
      if (bIds.has(id)) convIdSet.add(id);
    }
  }

  if (convIdSet.size === 0) return { messages: [], found: false };

  // ── Fetch all messages across every found conversation ────────────────────
  const { data: messages } = await db
    .from('messages')
    .select('id, sender_id, content, created_at')
    .in('conversation_id', [...convIdSet])
    .order('created_at', { ascending: true });

  return { messages: messages || [], found: messages && messages.length > 0 };
}
