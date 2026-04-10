import { db } from './db.js';
import { securityLog } from '../utils/logger.js';
import type { Profile } from '../types/index.js';

export async function deleteAccount(profile: Profile) {
  const profileId = profile.id;

  // Find all conversations
  const { data: convs } = await db
    .from('conversations')
    .select('id')
    .or(`user_a.eq.${profileId},user_b.eq.${profileId}`);
  const convIds = (convs || []).map(c => c.id);

  // Delete in parallel: messages, viewers, notifications, match requests, passes, reports
  await Promise.all([
    ...(convIds.length > 0 ? [
      db.from('messages').delete().in('conversation_id', convIds),
      db.from('conversation_viewers').delete().in('conversation_id', convIds),
    ] : []),
    db.from('notifications').delete().or(`user_id.eq.${profileId},related_user.eq.${profileId}`),
    db.from('match_requests').delete().or(`from_user.eq.${profileId},to_user.eq.${profileId}`),
    db.from('passes').delete().or(`from_user.eq.${profileId},to_user.eq.${profileId}`),
    db.from('reports').delete().or(`reporter_id.eq.${profileId},reported_id.eq.${profileId}`),
    db.from('blocked_users').delete().or(`blocker_id.eq.${profileId},blocked_id.eq.${profileId}`),
  ] as any[]);

  // Delete conversations
  if (convIds.length > 0) {
    await db.from('conversations').delete().in('id', convIds);
  }

  // Delete profile
  await db.from('profiles').delete().eq('id', profileId);

  // Delete Supabase Auth user (invalidates sessions)
  try {
    await db.auth.admin.deleteUser(profile.auth_user_id);
  } catch {
    // Continue even if auth deletion fails
  }

  // M6: Audit log for account deletion
  securityLog.accountDeleted(profileId, profile.auth_user_id);

  return { success: true };
}
