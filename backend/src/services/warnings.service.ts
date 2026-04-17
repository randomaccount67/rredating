import { db } from './db.js';
import { badRequest, forbidden } from '../utils/errors.js';
import { uuidSchema } from '../utils/validation.js';

export async function createWarning(adminId: string, userId: string, message: string) {
  if (!userId) throw badRequest('user_id is required');
  if (!message?.trim()) throw badRequest('message is required');
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) throw badRequest('Invalid user_id format');

  const { data, error } = await db
    .from('warnings')
    .insert({ user_id: userId, admin_id: adminId, message: message.trim() })
    .select('id, user_id, message, created_at, acknowledged')
    .single();

  if (error) throw new Error(`Failed to create warning: ${error.message}`);
  return { warning: data };
}

export async function getWarningsForUser(userId: string) {
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) throw badRequest('Invalid user_id format');

  const { data } = await db
    .from('warnings')
    .select('id, message, acknowledged, created_at, admin:profiles!warnings_admin_id_fkey(id, riot_id, riot_tag)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { warnings: data || [] };
}

// Single batch query — no N+1
export async function getWarningCounts(userIds: string[]): Promise<Record<string, number>> {
  if (!userIds.length) return {};

  const { data } = await db
    .from('warnings')
    .select('user_id')
    .in('user_id', userIds);

  const counts: Record<string, number> = {};
  for (const row of (data || []) as { user_id: string }[]) {
    counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
  }
  return counts;
}

export async function getActiveWarnings(userId: string) {
  const { data } = await db
    .from('warnings')
    .select('id, message, created_at')
    .eq('user_id', userId)
    .eq('acknowledged', false)
    .order('created_at', { ascending: true });

  return { warnings: data || [] };
}

export async function acknowledgeWarning(warningId: string, userId: string) {
  const parsed = uuidSchema.safeParse(warningId);
  if (!parsed.success) throw badRequest('Invalid warning ID format');

  const { data: warning } = await db
    .from('warnings')
    .select('user_id')
    .eq('id', warningId)
    .single();

  if (!warning) throw badRequest('Warning not found');
  if ((warning as { user_id: string }).user_id !== userId) {
    throw forbidden("Cannot acknowledge another user's warning");
  }

  await db
    .from('warnings')
    .update({ acknowledged: true })
    .eq('id', warningId);

  return { success: true };
}
