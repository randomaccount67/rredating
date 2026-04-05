'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MessageSquare, UserCheck, Clock } from 'lucide-react';

interface InboxItem {
  id: string;
  type: 'match_request' | 'conversation';
  user: {
    id: string;
    riot_id: string | null;
    riot_tag: string | null;
    avatar_url: string | null;
    current_rank: string | null;
  };
  status?: string;
  last_message?: string;
  unread?: number;
  created_at: string;
  conversation_id?: string;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'requests' | 'chats'>('requests');

  useEffect(() => {
    async function fetchInbox() {
      try {
        const res = await fetch('/api/inbox');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchInbox();
  }, []);

  const requests = items.filter(i => i.type === 'match_request');
  const chats = items.filter(i => i.type === 'conversation');

  const handleAccept = async (requestId: string, fromUserId: string) => {
    try {
      const res = await fetch('/api/match/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action: 'accept' }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i =>
          i.id === requestId ? { ...i, status: 'matched' } : i
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await fetch('/api/match/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action: 'decline' }),
      });
      setItems(prev => prev.filter(i => i.id !== requestId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <span className="label text-[#FF4655]">// COMMUNICATIONS</span>
        <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          INBOX
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2D35] mb-6">
        {[
          { key: 'requests', label: 'DUO REQUESTS', icon: <UserCheck size={14} />, count: requests.filter(r => r.status === 'pending').length },
          { key: 'chats', label: 'MESSAGES', icon: <MessageSquare size={14} />, count: chats.reduce((acc, c) => acc + (c.unread ?? 0), 0) },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'requests' | 'chats')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 relative ${tab === t.key ? 'border-[#FF4655] text-[#FF4655]' : 'border-transparent text-[#8B8FA8] hover:text-[#E8EAF0]'}`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            {t.icon} {t.label}
            {t.count > 0 && (
              <span className="bg-[#FF4655] text-white text-[9px] font-mono w-4 h-4 rounded-full flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1A1D24] border border-[#2A2D35] h-20 animate-pulse" />
          ))}
        </div>
      ) : tab === 'requests' ? (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <UserCheck size={32} className="text-[#2A2D35] mx-auto mb-3" />
              <p className="font-bold text-xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NO REQUESTS YET
              </p>
              <p className="text-[#525566] text-sm mt-1 font-mono">Go browse and send some requests</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-[#1A1D24] border border-[#2A2D35] p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
                  {req.user.avatar_url ? (
                    <Image src={req.user.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[#525566]">
                      {req.user.riot_id?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-[#E8EAF0] truncate">
                    {req.user.riot_id}#{req.user.riot_tag}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {req.user.current_rank && (
                      <span className="font-mono text-[10px] text-[#525566]">{req.user.current_rank}</span>
                    )}
                    <span className="label text-[8px] flex items-center gap-1">
                      <Clock size={8} />
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {req.status === 'pending' ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="px-3 py-1.5 text-xs font-bold uppercase border border-[#2A2D35] text-[#525566] hover:border-[#525566] transition-all"
                      style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={() => handleAccept(req.id, req.user.id)}
                      className="px-3 py-1.5 text-xs font-bold uppercase bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
                      style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)' }}
                    >
                      ACCEPT
                    </button>
                  </div>
                ) : req.status === 'matched' ? (
                  <span className="text-xs font-mono text-green-400 border border-green-400/20 px-2 py-1">MATCHED</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {chats.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={32} className="text-[#2A2D35] mx-auto mb-3" />
              <p className="font-bold text-xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NO CONVERSATIONS
              </p>
              <p className="text-[#525566] text-sm mt-1 font-mono">Match with someone to start chatting</p>
            </div>
          ) : (
            chats.map(chat => (
              <Link
                key={chat.id}
                href={`/inbox/${chat.conversation_id}`}
                className="flex items-center gap-4 bg-[#1A1D24] border border-[#2A2D35] hover:border-[#FF4655]/30 p-4 transition-all"
              >
                <div className="w-12 h-12 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
                  {chat.user.avatar_url ? (
                    <Image src={chat.user.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[#525566]">
                      {chat.user.riot_id?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-[#E8EAF0]">
                    {chat.user.riot_id}#{chat.user.riot_tag}
                  </p>
                  {chat.last_message && (
                    <p className="text-[#525566] text-xs truncate mt-0.5 font-mono">{chat.last_message}</p>
                  )}
                </div>

                {chat.unread && chat.unread > 0 ? (
                  <span className="bg-[#FF4655] text-white text-[9px] font-mono w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {chat.unread}
                  </span>
                ) : null}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
