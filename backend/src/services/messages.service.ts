import { db } from './db.js';
import { cleanProfanity } from '../utils/helpers.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import { PROFILE_PUBLIC_COLUMNS } from '../utils/columns.js';
import { uuidSchema } from '../utils/validation.js';
import type { Profile } from '../types/index.js';

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

  // Broadcasting is now handled automatically by Supabase Realtime via Postgres Changes.

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

export async function heartbeat(profileId: string, conversationId: string) {
  if (!conversationId) throw badRequest('conversation_id is required');

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
      last_seen_at: new Date().toISOString(),
    });
  return { success: true };
}

export async function leave(profileId: string, conversationId: string) {
  if (!conversationId) throw badRequest('conversation_id is required');

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
    .delete()
    .eq('user_id', profileId)
    .eq('conversation_id', conversationId);
  return { success: true };
}
