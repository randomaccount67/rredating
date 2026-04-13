import { db } from './db.js';
import type { Profile } from '../types/index.js';

export async function listNotifications(profile: Profile) {
  const { data: notifs } = await db
    .from('notifications')
    .select('id, type, related_user, read, created_at, profiles!notifications_related_user_fkey(riot_id, riot_tag)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Build conversation map for new_message links
  const messageNotifs = (notifs || []).filter((n: any) => n.type === 'new_message' && n.related_user);
  const convMap: Record<string, string> = {};

  if (messageNotifs.length > 0) {
    const userIds = [...new Set(messageNotifs.map((n: any) => n.related_user))];
    for (const uid of userIds) {
      const { data: conv } = await db
        .from('conversations')
        .select('id')
        .or(`and(user_a.eq.${profile.id},user_b.eq.${uid}),and(user_a.eq.${uid},user_b.eq.${profile.id})`)
        .limit(1)
        .single();
      if (conv) convMap[uid as string] = conv.id;
    }
  }

  const notifications = (notifs || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    related_user: n.profiles ? { riot_id: n.profiles.riot_id, riot_tag: n.profiles.riot_tag } : null,
    read: n.read,
    created_at: n.created_at,
    conversation_id: n.related_user ? convMap[n.related_user] ?? null : null,
  }));

  return { notifications };
}

export async function markAllRead(profile: Profile, relatedUserId?: string) {
  let query = db
    .from('notifications')
    .update({ read: true })
    .eq('user_id', profile.id)
    .eq('read', false);

  if (relatedUserId) {
    query = query.eq('related_user', relatedUserId);
  }

  await query;
  return { success: true };
}
