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

  // Fetch all conversations between these users (duplicates may exist from old bugs)
  const { data: convRows } = await db
    .from('conversations')
    .select('id')
    .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`);

  if (!convRows || convRows.length === 0) return { messages: [], found: false };

  const convIds = convRows.map((c: any) => c.id);

  // Fetch messages from all conversations merged and sorted chronologically
  const { data: messages } = await db
    .from('messages')
    .select('id, sender_id, content, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: true });

  return { messages: messages || [], found: true };
}
