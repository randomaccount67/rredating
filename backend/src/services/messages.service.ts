import { db } from './db.js';
import { config } from '../config.js';
import { cleanProfanity } from '../utils/helpers.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import type { Profile } from '../types/index.js';

/**
 * Broadcast a new message to all frontend realtime subscribers via the Supabase
 * Broadcast REST API. Uses the service-role key so RLS doesn't block delivery.
 * Fire-and-forget: errors are logged but never thrown.
 */
async function broadcastMessage(conversationId: string, message: Record<string, unknown>): Promise<void> {
  try {
    const url = `${config.supabaseUrl}/realtime/v1/api/broadcast`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.supabaseServiceRoleKey}`,
        'apikey': config.supabaseServiceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          topic: `realtime:conversation:${conversationId}`,
          event: 'new_message',
          payload: { message },
        }],
      }),
    });
    const text = await res.text();
    console.log('[broadcast] broadcast result:', res.status, text);
    if (!res.ok) {
      console.error(`[broadcast] HTTP ${res.status}:`, text);
    }
  } catch (err) {
    console.log('[broadcast] broadcast error:', err);
  }
}

// ─── Messages ──────────────────────────────────────────────────

export async function getMessages(profile: Profile, conversationId: string) {
  if (!conversationId) throw badRequest('conversation_id is required');

  const { data: conv } = await db
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conv) throw notFound('Conversation not found');
  if (conv.user_a !== profile.id && conv.user_b !== profile.id) {
    throw forbidden('Not your conversation');
  }

  const otherId = conv.user_a === profile.id ? conv.user_b : conv.user_a;

  const [messagesRes, otherUserRes] = await Promise.all([
    db.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('profiles')
      .select(PROFILE_PUBLIC_COLUMNS)
      .eq('id', otherId)
      .single(),
  ]);

  const messages = (messagesRes.data || []).reverse();

  return {
    id: conversationId,
    other_user: otherUserRes.data,
    messages,
    my_profile_id: profile.id,
  };
}

export async function sendMessage(profile: Profile, conversationId: string, content: string) {
  if (!conversationId) throw badRequest('conversation_id is required');
  if (!content || !content.trim()) throw badRequest('Message content is required');
  if (content.length > 1000) throw badRequest('Message too long (max 1000 characters)');

  const { data: conv } = await db
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conv) throw notFound('Conversation not found');
  if (conv.user_a !== profile.id && conv.user_b !== profile.id) {
    throw forbidden('Not your conversation');
  }

  const cleaned = cleanProfanity(content.trim());
  const otherId = conv.user_a === profile.id ? conv.user_b : conv.user_a;

  // Insert message
  const { data: message, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      content: cleaned,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Broadcast to frontend realtime subscribers. Fire-and-forget so a broadcast
  // failure never breaks message delivery.
  console.log('[broadcast] attempting broadcast for conversation:', conversationId);
  broadcastMessage(conversationId, message as unknown as Record<string, unknown>);

  // Check if other user is actively viewing (skip notification if so)
  const { data: viewer } = await db
    .from('conversation_viewers')
    .select('last_seen_at')
    .eq('user_id', otherId)
    .eq('conversation_id', conversationId)
    .single();

  const isViewing = viewer && (Date.now() - new Date(viewer.last_seen_at).getTime()) < 30_000;

  if (!isViewing) {
    await db.from('notifications').insert({
      user_id: otherId,
      type: 'new_message',
      related_user: profile.id,
    });
  }

  return { message };
}

// ─── Presence ──────────────────────────────────────────────────

export async function heartbeat(profileId: string, conversationId: string | null) {
  const now = new Date().toISOString();

  // Always mark user as online and update last_seen
  await db
    .from('profiles')
    .update({ is_online: true, last_seen: now })
    .eq('id', profileId);

  if (!conversationId) return { success: true };

  // H4 fix: Verify the user is a participant of this conversation
  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .or(`user_a.eq.${profileId},user_b.eq.${profileId}`)
    .single();

  if (!conv) throw forbidden('Not your conversation');

  await db
    .from('conversation_viewers')
    .upsert({
      user_id: profileId,
      conversation_id: conversationId,
      last_seen_at: now,
    });
  return { success: true };
}

export async function leave(profileId: string, conversationId: string | null) {
  // Mark user as offline
  await db
    .from('profiles')
    .update({ is_online: false })
    .eq('id', profileId);

  if (!conversationId) return { success: true };

  // H4 fix: Verify the user is a participant of this conversation
  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .or(`user_a.eq.${profileId},user_b.eq.${profileId}`)
    .single();

  if (!conv) return { success: true }; // Silently succeed — user may have already left

  await db
    .from('conversation_viewers')
    .delete()
    .eq('user_id', profileId)
    .eq('conversation_id', conversationId);
  return { success: true };
}
