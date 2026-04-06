'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Send, ArrowLeft, AlertTriangle, Flag } from 'lucide-react';
import ReportModal from '@/components/ReportModal';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ConversationData {
  id: string;
  other_user: {
    id: string;
    riot_id: string | null;
    riot_tag: string | null;
    avatar_url: string | null;
  };
  messages: Message[];
  my_profile_id: string;
}

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Maintain presence while viewing this conversation
  useEffect(() => {
    if (!params.id) return;
    const conversationId = params.id as string;

    const ping = () => fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId }),
    });

    ping();
    const interval = setInterval(ping, 15_000);

    const leave = () => fetch('/api/presence', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`/api/messages?conversation_id=${params.id}`);
        if (!res.ok) { router.push('/inbox'); return; }
        const d = await res.json();
        setData(d);
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
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        // No server-side filter — Supabase can't verify RLS when using Clerk JWTs
        // (auth.uid() is null for anon client), so the filter silently drops events.
        // We filter client-side instead.
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.conversation_id !== conversationId) return;
        setData(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMsg],
        } : prev);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: params.id, content: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to send');
      }
      setMessage('');
      inputRef.current?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
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
        <div className="w-10 h-10 bg-[#13151A] border border-[#2A2D35] overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)' }}>
          {data.other_user.avatar_url ? (
            <Image src={data.other_user.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-mono text-[#525566] text-sm">
              {data.other_user.riot_id?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-mono text-sm text-[#E8EAF0]">{otherName}</p>
          <p className="label text-[8px] text-green-400">MATCHED DUO</p>
        </div>
        <button
          onClick={() => setShowReport(true)}
          className="text-[#525566] hover:text-[#FF4655] transition-colors p-1"
          title="Report this user"
        >
          <Flag size={14} />
        </button>
      </div>

      {showReport && (
        <ReportModal
          reportedProfileId={data.other_user.id}
          reportedName={otherName}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {data.messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#525566] font-mono text-sm">START THE CONVERSATION. GOOD LUCK.</p>
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
                  style={{ clipPath: isMe
                    ? 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)'
                    : 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)'
                  }}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className="font-mono text-[9px] text-[#525566] mt-1 text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          className="flex-1 bg-[#1A1D24] border border-[#2A2D35] px-4 py-2.5 text-sm font-mono focus:border-[#FF4655] outline-none"
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
