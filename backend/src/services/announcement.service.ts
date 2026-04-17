import { db } from './db.js';
import { badRequest, notFound } from '../utils/errors.js';
import { uuidSchema } from '../utils/validation.js';

export async function getActiveAnnouncement() {
  const { data } = await db
    .from('announcements')
    .select('id, content, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { announcement: data ?? null };
}

export async function listAnnouncements() {
  const { data } = await db
    .from('announcements')
    .select('id, content, is_active, created_at')
    .order('created_at', { ascending: false });
  return { announcements: data ?? [] };
}

export async function createAnnouncement(content: string, is_active: boolean) {
  if (!content?.trim()) throw badRequest('content is required');

  if (is_active) {
    await db.from('announcements').update({ is_active: false }).eq('is_active', true);
  }

  const { data, error } = await db
    .from('announcements')
    .insert({ content: content.trim(), is_active })
    .select('id, content, is_active, created_at')
    .single();

  if (error) throw new Error(error.message);
  return { announcement: data };
}

export async function updateAnnouncement(
  id: string,
  updates: { content?: string; is_active?: boolean },
) {
  if (!uuidSchema.safeParse(id).success) throw badRequest('Invalid announcement ID');

  if (updates.is_active) {
    await db.from('announcements').update({ is_active: false }).eq('is_active', true).neq('id', id);
  }

  const patch: Record<string, unknown> = {};
  if (updates.content !== undefined) patch.content = updates.content.trim();
  if (updates.is_active !== undefined) patch.is_active = updates.is_active;

  const { data, error } = await db
    .from('announcements')
    .update(patch)
    .eq('id', id)
    .select('id, content, is_active, created_at')
    .single();

  if (error) throw notFound('Announcement not found');
  return { announcement: data };
}

export async function deleteAnnouncement(id: string) {
  if (!uuidSchema.safeParse(id).success) throw badRequest('Invalid announcement ID');
  await db.from('announcements').delete().eq('id', id);
  return { success: true };
}
