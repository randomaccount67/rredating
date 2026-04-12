'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft, AlertTriangle, Flag, UserX } from 'lucide-react';
import ReportModal from '@/components/shared/ReportModal';
import ProfileModal from '@/components/profile/ProfileModal';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { PartialProfile, buildProfile } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}


interface ConversationData {
  id: string;
  other_user: PartialProfile;
  messages: Message[];
  my_profile_id: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        api('/api/notifications/read', { method: 'POST' }).catch(() => {});
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
    // NOTE: Server-side filter removed — some Supabase setups require REPLICA IDENTITY FULL
    // for non-PK column filters to work. We filter client-side instead.
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('[Realtime] messages INSERT payload:', payload);
          const newMsg = payload.new as Message;
          if (!newMsg || newMsg.conversation_id !== conversationId) return;
          setData(prev => {
            if (!prev) return prev;
            if (prev.messages.some(m => m.id === newMsg.id)) return prev;
            return { ...prev, messages: [...prev.messages, newMsg] };
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] messages channel status:', status, err ?? '');
      });

    return () => { supabase.removeChannel(channel); };
  }, [params.id, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [data?.messages.length, scrollToBottom]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: params.id, content: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to send');
      }

      const { message: newMsg } = await res.json();
      setData(prev => {
        if (!prev) return prev;
        if (prev.messages.some(m => m.id === newMsg.id)) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
      setTimeout(scrollToBottom, 100);
      setMessage('');
      inputRef.current?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
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

        {/* Clickable avatar + name — opens profile */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {data.messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#525566] text-sm">Start the conversation. Good luck.</p>
          </div>
        ) : (
          data.messages.map(msg => {
            const isMe = msg.sender_id === data.my_profile_id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-3 py-2 text-sm ${
                    isMe
                      ? 'bg-[#FF4655]/20 border border-[#FF4655]/30 text-[#E8EAF0]'
                      : 'bg-[#1E2128] border border-[#2A2D35] text-[#E8EAF0]'
                  }`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className="font-mono text-[9px] text-[#525566] mt-1 text-right">
                    {new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
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

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 bg-[#1A1D24] border border-[#2A2D35] px-4 py-2.5 text-sm focus:border-[#FF4655] outline-none"
          placeholder="TYPE MESSAGE..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          maxLength={1000}
        />
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
