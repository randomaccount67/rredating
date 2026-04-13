import { db } from './db.js';
import { badRequest }from '../utils/errors.js';
import { uuidSchema } from '../utils/validation.js';
import { securityLog } from '../utils/logger.js';
import type { Profile } from '../types/index.js';

// ─── Block ─────────────────────────────────────────────────────

export async function blockUser(profile: Profile, blockedId: string) {
  if (!blockedId) throw badRequest('blocked_profile_id is required');
  if (blockedId === profile.id) throw badRequest('Cannot block yourself');
  // H5 fix: Validate UUID format before interpolating into filter
  const parsed = uuidSchema.safeParse(blockedId);
  if (!parsed.success) throw badRequest('Invalid profile ID format');

  // Insert block (ignore duplicates)
  await db.from('blocked_users').upsert(
    { blocker_id: profile.id, blocked_id: blockedId },
    { ignoreDuplicates: true }
  );

  // Clear presence records for the conversation but preserve messages and the
  // conversation itself so admins can still review the chat via the admin panel.
  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .or(
      `and(user_a.eq.${profile.id},user_b.eq.${blockedId}),and(user_a.eq.${blockedId},user_b.eq.${profile.id})`
    )
    .single();

  if (conv) {
    // Only clear ephemeral presence rows — messages stay for admin review
    await db.from('conversation_viewers').delete().eq('conversation_id', conv.id);
  }

  // Delete match requests between users (both directions)
  await Promise.all([
    db.from('match_requests').delete().eq('from_user', profile.id).eq('to_user', blockedId),
    db.from('match_requests').delete().eq('from_user', blockedId).eq('to_user', profile.id),
  ]);

  // Delete notifications from blocked user
  await db.from('notifications').delete().eq('user_id', profile.id).eq('related_user', blockedId);

  // M6: Audit log
  securityLog.userBlocked(profile.id, blockedId);

  return { success: true };
}

export async function getBlockedUsers(profile: Profile) {
  console.log(`[moderation.getBlockedUsers] profile.id=${profile.id}`);
  const { data: blockRows, error: blockError } = await db
    .from('blocked_users')
    .select('blocked_id, created_at')
    .eq('blocker_id', profile.id)
    .order('created_at', { ascending: false });

  console.log(`[moderation.getBlockedUsers] blockRows=${JSON.stringify(blockRows)}, error=${JSON.stringify(blockError)}`);
  if (!blockRows || blockRows.length === 0) return { blocked: [] };

  const blockedIds = blockRows.map(r => r.blocked_id);
  const { data: profileRows } = await db
    .from('profiles')
    .select('id, riot_id, riot_tag, avatar_url')
    .in('id', blockedIds);

  const profileMap: Record<string, any> = {};
  profileRows?.forEach(p => { profileMap[p.id] = p; });

  const blocked = blockRows.map(r => ({
    blocked_id: r.blocked_id,
    created_at: r.created_at,
    profiles: profileMap[r.blocked_id] ?? null,
  }));

  return { blocked };
}

export async function unblockUser(profile: Profile, blockedId: string) {
  if (!blockedId) throw badRequest('blocked_profile_id is required');
  const parsed = uuidSchema.safeParse(blockedId);
  if (!parsed.success) throw badRequest('Invalid profile ID format');

  await db
    .from('blocked_users')
    .delete()
    .eq('blocker_id', profile.id)
    .eq('blocked_id', blockedId);

  return { success: true };
}

// ─── Reports ───────────────────────────────────────────────────

export async function createReport(profile: Profile, reportedId: string, reason: string, details?: string) {
  if (!reportedId || !reason) throw badRequest('reported_profile_id and reason are required');
  if (reportedId === profile.id) throw badRequest('Cannot report yourself');
  // H5 fix: Validate UUID format
  const parsed = uuidSchema.safeParse(reportedId);
  if (!parsed.success) throw badRequest('Invalid profile ID format');

  if (reason.length > 200) throw badRequest('Reason too long (max 200 characters)');
  if (details && details.length > 2000) throw badRequest('Details too long (max 2000 characters)');

  const { error } = await db.from('reports').insert({
    reporter_id: profile.id,
    reported_id: reportedId,
    reason,
    details: details || null,
  });

  if (error) throw new Error(error.message);

  // M6: Audit log
  securityLog.reportCreated(profile.id, reportedId, reason);

  return { ok: true };
}
