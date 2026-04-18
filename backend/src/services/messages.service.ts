import { db } from './db.js';
import { cleanProfanity } from '../utils/helpers.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import { broadcast } from '../utils/broadcast.js';
import type { Profile } from '../types/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RawMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  [key: string]: unknown;
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

  const messages = ((messagesRes.data || []).reverse()) as RawMessage[];

  // Mark any unread new_message notifications from this conversation as read
  // so the inbox unread indicator and navbar badge clear immediately.
  await db.from('notifications')
    .update({ read: true })
    .eq('user_id', profile.id)
    .eq('type', 'new_message')
    .eq('related_user', otherId)
    .eq('read', false);

  // Resolve reply references in memory — no N+1 query.
  // Parent messages are almost always in the same 200-message window.
  const msgMap = new Map<string, { id: string; sender_id: string; content: string }>(
    messages.map(m => [m.id, { id: m.id, sender_id: m.sender_id, content: m.content }]),
  );
  const enriched = messages.map(m => ({
    ...m,
    reply_to: m.reply_to_id ? (msgMap.get(m.reply_to_id) ?? null) : null,
  }));

  return {
    id: conversationId,
    other_user: otherUserRes.data,
    messages: enriched,
    my_profile_id: profile.id,
    my_is_supporter: profile.is_supporter,
  };
}

export async function sendMessage(
  profile: Profile,
  conversationId: string,
  content: string,
  replyToId?: string | null,
) {
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

  // Validate reply_to_id: must be a valid UUID referencing a message in this conversation.
  // If invalid or cross-conversation, silently ignore (don't block the send).
  let resolvedReplyToId: string | null = null;
  if (replyToId && UUID_RE.test(replyToId)) {
    const { data: parent } = await db
      .from('messages')
      .select('id')
      .eq('id', replyToId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (parent) resolvedReplyToId = replyToId;
  }

  // Insert message
  const insertData: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: profile.id,
    content: cleaned,
  };
  if (resolvedReplyToId) insertData.reply_to_id = resolvedReplyToId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error } = await db
    .from('messages')
    .insert(insertData as any)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Broadcast new message to the conversation channel (recipient sees it instantly in chat)
  await broadcast(`conversation:${conversationId}`, 'new_message', { message });
  console.log('[broadcast] conversation:', conversationId);

  // Broadcast to recipient's inbox channel so the conversation list refreshes
  await broadcast(`inbox:${otherId}`, 'new_message', {
    conversation_id: conversationId,
    sender_id: profile.id,
    preview: (message as Record<string, unknown>).content,
  });

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
    // Broadcast to recipient's notification channel so the alerts badge updates instantly
    await broadcast(`notification:${otherId}`, 'new_notification', {
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
