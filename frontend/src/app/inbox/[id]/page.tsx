'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft, AlertTriangle, Flag, UserX, HeartOff, Smile, CornerDownLeft, X } from 'lucide-react';
import ReportModal from '@/components/shared/ReportModal';
import ProfileModal from '@/components/profile/ProfileModal';
import EmojiPicker from '@/components/chat/EmojiPicker';
import GifPicker from '@/components/chat/GifPicker';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { PartialProfile, buildProfile } from '@/lib/utils';

interface ReplyTo {
  id: string;
  sender_id: string;
  content: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  reply_to?: ReplyTo | null;
}

interface ConversationData {
  id: string;
  other_user: PartialProfile;
  messages: Message[];
  my_profile_id: string;
  my_is_supporter: boolean;
}

function extractGifUrl(content: string): string | null {
  const m = content.match(/^\[gif:(https?:\/\/.+)\]$/);
  return m?.[1] ?? null;
}

function truncate(text: string, max = 60): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function MessageThreadPage() {
  const api = useApi();
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showGifUpsell, setShowGifUpsell] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gifUpsellRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = messageRefs.current.get(msgId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  }, []);

  const startReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleLongPressStart = useCallback((msg: Message) => {
    longPressTimerRef.current = setTimeout(() => startReply(msg), 500);
  }, [startReply]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Clean up long-press timer on unmount
  useEffect(() => {
    return () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  }, []);

  // Maintain presence while viewing this conversation
  useEffect(() => {
    if (!params.id) return;
    const conversationId = params.id as string;

    const ping = () => api('/api/presence', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    });

    ping();
    const interval = setInterval(ping, 30_000);

    const leave = () => api('/api/presence', {
      method: 'DELETE',
      body: JSON.stringify({ conversation_id: conversationId }),
    });

    window.addEventListener('beforeunload', leave);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', leave);
      leave();
    };
  }, [params.id]);

  useEffect(() => {
    async function fetchConversation() {
      try {
        const res = await api(`/api/messages?conversation_id=${params.id}`);
        if (!res.ok) { router.push('/inbox'); return; }
        const d = await res.json();
        setData(d);
        // Mark only this conversation partner's notifications as read so other
        // conversations' unread indicators are not affected.
        api('/api/notifications/read', {
          method: 'POST',
          body: JSON.stringify({ related_user_id: d.other_user?.id }),
        }).then(() => {
          // Signal the Navbar to refresh its unread badge immediately
          window.dispatchEvent(new CustomEvent('rr:notifications-read'));
        }).catch(() => {});
      } catch (e) {
        console.error(e);
        router.push('/inbox');
      } finally {
        setLoading(false);
      }
    }
    fetchConversation();
  }, [params.id, router]);

  useEffect(() => {
    if (!params.id) return;
    const conversationId = params.id as string;
    const supabase = createClient();

    // Using Supabase Broadcast (not postgres_changes) so delivery is not blocked
    // by RLS. The backend sends a broadcast via the service-role key after every insert.
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload) => {
          console.log('[Realtime] broadcast new_message received:', JSON.stringify(payload));
          const newMsg = payload.payload?.message as Message | undefined;
          if (!newMsg?.id) {
            console.warn('[Realtime] broadcast payload missing message.id:', payload);
            return;
          }
          setData(prev => {
            if (!prev) return prev;
            // Deduplicate — our own send is already in state from handleSend
            if (prev.messages.some(m => m.id === newMsg.id)) return prev;
            // Resolve reply reference from messages already in state
            const enriched: Message = newMsg.reply_to_id
              ? { ...newMsg, reply_to: prev.messages.find(m => m.id === newMsg.reply_to_id) ?? null }
              : { ...newMsg, reply_to: null };
            console.log('[Realtime] appending message to state:', newMsg.id);
            return { ...prev, messages: [...prev.messages, enriched] };
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] conversation channel status:', status, err ?? '');
      });

    return () => { supabase.removeChannel(channel); };
  }, [params.id, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [data?.messages.length, scrollToBottom]);

  // Close upsell popup on outside click
  useEffect(() => {
    if (!showGifUpsell) return;
    function handle(e: MouseEvent) {
      if (gifUpsellRef.current && !gifUpsellRef.current.contains(e.target as Node)) {
        setShowGifUpsell(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showGifUpsell]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError('');
    const replySnapshot = replyingTo;
    try {
      const body: Record<string, unknown> = {
        conversation_id: params.id,
        content: message.trim(),
      };
      if (replySnapshot) body.reply_to_id = replySnapshot.id;

      const res = await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to send');
      }

      const { message: newMsg } = await res.json();
      const enriched: Message = replySnapshot
        ? { ...newMsg, reply_to: { id: replySnapshot.id, sender_id: replySnapshot.sender_id, content: replySnapshot.content } }
        : { ...newMsg, reply_to: null };
      setData(prev => {
        if (!prev) return prev;
        if (prev.messages.some(m => m.id === enriched.id)) return prev;
        return { ...prev, messages: [...prev.messages, enriched] };
      });
      setTimeout(scrollToBottom, 100);
      setMessage('');
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleSendGif = async (url: string) => {
    setShowGifPicker(false);
    const replySnapshot = replyingTo;
    try {
      const body: Record<string, unknown> = {
        conversation_id: params.id,
        content: `[gif:${url}]`,
      };
      if (replySnapshot) body.reply_to_id = replySnapshot.id;

      const res = await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const { message: newMsg } = await res.json();
      const enriched: Message = replySnapshot
        ? { ...newMsg, reply_to: { id: replySnapshot.id, sender_id: replySnapshot.sender_id, content: replySnapshot.content } }
        : { ...newMsg, reply_to: null };
      setData(prev => {
        if (!prev) return prev;
        if (prev.messages.some(m => m.id === enriched.id)) return prev;
        return { ...prev, messages: [...prev.messages, enriched] };
      });
      setReplyingTo(null);
      setTimeout(scrollToBottom, 100);
    } catch { /* non-critical */ }
  };

  const handleEmojiSelect = (emoji: string) => {
    setShowEmojiPicker(false);
    const input = inputRef.current;
    if (!input) { setMessage(prev => prev + emoji); return; }
    const start = input.selectionStart ?? message.length;
    const end = input.selectionEnd ?? message.length;
    const next = message.slice(0, start) + emoji + message.slice(end);
    setMessage(next);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleBlock = async () => {
    if (!data) return;
    setBlocking(true);
    try {
      const res = await api('/api/block', {
        method: 'POST',
        body: JSON.stringify({ blocked_profile_id: data.other_user.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to block');
        setShowBlockConfirm(false);
        return;
      }
      router.push('/inbox');
    } catch {
      setError('Failed to block');
      setShowBlockConfirm(false);
    } finally {
      setBlocking(false);
    }
  };

  const handleUnmatch = async () => {
    if (!data) return;
    setUnmatching(true);
    try {
      const res = await api('/api/match', {
        method: 'DELETE',
        body: JSON.stringify({ other_profile_id: data.other_user.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to unmatch');
        setShowUnmatchConfirm(false);
        return;
      }
      router.push('/inbox');
    } catch {
      setError('Failed to unmatch');
      setShowUnmatchConfirm(false);
    } finally {
      setUnmatching(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-[#1A1D24] border border-[#2A2D35] h-96 animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const otherName = data.other_user.riot_id
    ? `${data.other_user.riot_id}#${data.other_user.riot_tag}`
    : 'UNKNOWN';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#2A2D35]">
        <Link href="/inbox" className="text-[#525566] hover:text-[#E8EAF0] transition-colors">
          <ArrowLeft size={18} />
        </Link>

        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
            style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)' }}>
            {data.other_user.avatar_url ? (
              <img src={data.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-[#525566] text-sm">
                {data.other_user.riot_id?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div>
            <p className="font-mono text-sm text-[#E8EAF0] hover:text-[#00E5FF] transition-colors truncate">{otherName}</p>
            <p className="label text-[8px] text-green-400">MATCHED DUO · TAP TO VIEW PROFILE</p>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowUnmatchConfirm(true)}
            className="text-[#525566] hover:text-amber-400 transition-colors p-1"
            title="Unmatch"
            aria-label="Unmatch"
          >
            <HeartOff size={14} />
          </button>
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="text-[#525566] hover:text-[#FF4655] transition-colors p-1"
            title="Block this user"
            aria-label="Block this user"
          >
            <UserX size={14} />
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="text-[#525566] hover:text-[#FF4655] transition-colors p-1"
            title="Report this user"
            aria-label="Report this user"
          >
            <Flag size={14} />
          </button>
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <ReportModal
          reportedProfileId={data.other_user.id}
          reportedName={otherName}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal
          profile={buildProfile(data.other_user)}
          onClose={() => setShowProfile(false)}
          onSendRequest={() => {}}
          onPass={() => {}}
          requestStatus="matched"
        />
      )}

      {/* Block confirmation modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="bg-[#1A1D24] border border-[#FF4655]/40 p-6 max-w-sm w-full"
            style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
          >
            <h3 className="font-bold text-lg uppercase text-[#FF4655] mb-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              BLOCK {otherName}?
            </h3>
            <p className="text-[#8B90A8] text-sm mb-6 font-mono">
              This will end your match and they won&apos;t be able to contact you again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockConfirm(false)}
                disabled={blocking}
                className="flex-1 py-2.5 text-sm font-bold uppercase border border-[#252830] text-[#525566] hover:border-[#525566] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleBlock}
                disabled={blocking}
                className="flex-1 py-2.5 text-sm font-bold uppercase bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                {blocking ? 'BLOCKING...' : 'CONFIRM BLOCK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unmatch confirmation modal */}
      {showUnmatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="bg-[#1A1D24] border border-amber-500/40 p-6 max-w-sm w-full"
            style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
          >
            <h3 className="font-bold text-lg uppercase text-amber-400 mb-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              UNMATCH {otherName}?
            </h3>
            <p className="text-[#8B90A8] text-sm mb-6 font-mono">
              This will remove your match and close the conversation. You won&apos;t be blocked — you may see each other again in Browse.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnmatchConfirm(false)}
                disabled={unmatching}
                className="flex-1 py-2.5 text-sm font-bold uppercase border border-[#252830] text-[#525566] hover:border-[#525566] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleUnmatch}
                disabled={unmatching}
                className="flex-1 py-2.5 text-sm font-bold uppercase bg-amber-500 text-[#11141B] hover:bg-amber-400 transition-all disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                {unmatching ? 'UNMATCHING...' : 'CONFIRM UNMATCH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
        {data.messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#525566] text-sm">Start the conversation. Good luck.</p>
          </div>
        ) : (
          data.messages.map(msg => {
            const isMe = msg.sender_id === data.my_profile_id;
            const gifUrl = extractGifUrl(msg.content);
            const isHighlighted = highlightedMsgId === msg.id;

            // Reply block — shown above the message bubble when this message is a reply
            const replyBlock = msg.reply_to_id ? (
              msg.reply_to ? (
                <button
                  type="button"
                  onClick={() => scrollToMessage(msg.reply_to!.id)}
                  className={`flex items-start gap-1.5 w-full px-2 py-1.5 bg-[#0D0F14] border-l-2 border-[#525566]/60 hover:bg-[#13151A] transition-colors text-left`}
                >
                  <CornerDownLeft size={10} className="text-[#525566] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] text-[#525566] mb-0.5">
                      {msg.reply_to.sender_id === data.my_profile_id ? 'you' : data.other_user.riot_id ?? 'them'}
                    </p>
                    {extractGifUrl(msg.reply_to.content) ? (
                      <div className="flex items-center gap-1">
                        <img
                          src={extractGifUrl(msg.reply_to.content)!}
                          alt="GIF"
                          className="h-7 w-auto rounded object-cover"
                        />
                        <span className="font-mono text-[9px] text-[#525566]">GIF</span>
                      </div>
                    ) : (
                      <p className="text-[#8B90A8] text-[11px] truncate">{truncate(msg.reply_to.content)}</p>
                    )}
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#0D0F14] border-l-2 border-[#525566]/30">
                  <CornerDownLeft size={10} className="text-[#525566]/40 flex-shrink-0" />
                  <p className="text-[#525566]/60 text-[11px] italic">Original message was deleted</p>
                </div>
              )
            ) : null;

            // Reply button (same for both sides; positioned per alignment)
            const replyBtn = (
              <button
                type="button"
                onClick={() => startReply(msg)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#525566] hover:text-[#00E5FF] p-1 flex-shrink-0"
                title="Reply"
                aria-label="Reply"
              >
                <CornerDownLeft size={13} />
              </button>
            );

            return (
              <div
                key={msg.id}
                ref={el => { if (el) messageRefs.current.set(msg.id, el); else messageRefs.current.delete(msg.id); }}
                className={`flex items-end gap-1 ${isMe ? 'justify-end' : 'justify-start'} group`}
                onTouchStart={() => handleLongPressStart(msg)}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleLongPressEnd}
              >
                {/* Reply btn on left for own messages */}
                {isMe && replyBtn}

                {/* Message content column */}
                <div className={`flex flex-col gap-0 max-w-[280px] ${isHighlighted ? 'msg-highlight' : ''}`}>
                  {replyBlock}
                  {gifUrl ? (
                    <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <img
                        src={gifUrl}
                        alt="GIF"
                        className="max-w-[250px] rounded object-cover"
                        loading="lazy"
                      />
                      <p className="font-mono text-[9px] text-[#525566]">
                        {new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`px-3 py-2 text-sm ${
                        isMe
                          ? 'bg-[#FF4655]/20 border border-[#FF4655]/30 text-[#E8EAF0]'
                          : 'bg-[#1E2128] border border-[#2A2D35] text-[#E8EAF0]'
                      } ${replyBlock ? '' : ''}`}
                      style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className="font-mono text-[9px] text-[#525566] mt-1 text-right">
                        {new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reply btn on right for other's messages */}
                {!isMe && replyBtn}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-[#FF4655] text-xs font-mono mb-2 bg-[#FF4655]/5 border border-[#FF4655]/20 px-3 py-2">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Reply preview bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#13151A] border border-[#2A2D35] border-b-0">
          <div className="w-0.5 self-stretch bg-[#00E5FF] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[9px] text-[#00E5FF] mb-0.5 uppercase tracking-wider">
              Replying to {replyingTo.sender_id === data.my_profile_id ? 'yourself' : data.other_user.riot_id ?? 'them'}
            </p>
            {extractGifUrl(replyingTo.content) ? (
              <div className="flex items-center gap-1.5">
                <img src={extractGifUrl(replyingTo.content)!} alt="GIF" className="h-6 w-auto rounded" />
                <span className="text-[#525566] text-xs font-mono">GIF</span>
              </div>
            ) : (
              <p className="text-[#8B90A8] text-xs truncate">{truncate(replyingTo.content)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-[#525566] hover:text-[#E8EAF0] transition-colors p-1 flex-shrink-0"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="relative flex gap-2">
        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-2 z-40">
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
        {/* GIF picker */}
        {showGifPicker && (
          <div className="absolute bottom-full right-0 mb-2 z-40">
            <GifPicker
              onSend={handleSendGif}
              onClose={() => setShowGifPicker(false)}
            />
          </div>
        )}
        <input
          ref={inputRef}
          className="flex-1 bg-[#1A1D24] border border-[#2A2D35] px-4 py-2.5 text-sm focus:border-[#FF4655] outline-none"
          placeholder="TYPE MESSAGE..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            if (e.key === 'Escape' && replyingTo) { e.preventDefault(); setReplyingTo(null); }
          }}
          maxLength={1000}
        />
        {/* Emoji button — all users */}
        <button
          onClick={() => { setShowGifPicker(false); setShowGifUpsell(false); setShowEmojiPicker(prev => !prev); }}
          className="text-[#525566] hover:text-[#E8EAF0] transition-colors px-2 bg-[#1A1D24] border border-[#2A2D35] flex items-center"
          title="Emoji"
          aria-label="Emoji"
          type="button"
        >
          <Smile size={16} />
        </button>
        {/* GIF button — visible to all; opens picker for supporters, upsell for others */}
        <div className="relative" ref={gifUpsellRef}>
          <button
            onClick={() => {
              setShowEmojiPicker(false);
              if (!data.my_is_supporter) {
                setShowGifUpsell(prev => !prev);
                return;
              }
              setShowGifUpsell(false);
              setShowGifPicker(prev => !prev);
            }}
            className={`relative px-2.5 bg-[#1A1D24] border font-mono text-[10px] font-bold tracking-wider flex items-center h-full transition-colors ${
              data.my_is_supporter
                ? 'text-[#525566] hover:text-[#00E5FF] border-[#2A2D35]'
                : 'text-[#525566]/50 border-[#2A2D35]/50 hover:border-[#525566]/50'
            }`}
            title={data.my_is_supporter ? 'Send GIF' : 'GIFs are a Supporter feature'}
            aria-label={data.my_is_supporter ? 'Send GIF' : 'GIFs are a Supporter feature'}
            type="button"
          >
            GIF
            {!data.my_is_supporter && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] leading-none select-none">✨</span>
            )}
          </button>
          {showGifUpsell && !data.my_is_supporter && (
            <div
              className="absolute bottom-full right-0 mb-2 z-50 bg-[#1A1D24] border border-[#00E5FF]/30 p-3 w-52"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
            >
              <p className="font-mono text-[10px] text-[#E8EAF0] mb-2">GIFs are a Supporter feature ✨</p>
              <Link href="/supporter" className="font-mono text-[10px] text-[#00E5FF] hover:underline" onClick={() => setShowGifUpsell(false)}>
                Become a Supporter →
              </Link>
            </div>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="bg-[#FF4655] text-white px-4 hover:bg-[#FF5F6D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
