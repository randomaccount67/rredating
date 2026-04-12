'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, UserCheck, Clock, Users } from 'lucide-react';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import { createClient } from '@/lib/supabase';
import ProfileModal from '@/components/profile/ProfileModal';
import { Profile } from '@/types';
import { PartialProfile, buildProfile } from '@/lib/utils';


interface InboxItem {
  id: string;
  type: 'match_request' | 'conversation';
  user: PartialProfile;
  status?: string;
  last_message?: string;
  unread?: number;
  created_at: string;
  conversation_id?: string;
}



export default function InboxPage() {
  const api = useApi();
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'requests' | 'chats' | 'matches'>('requests');
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);

  const fetchInbox = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        if (data.my_profile_id) setMyProfileId(data.my_profile_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox(true);
  }, [fetchInbox]);

  // Realtime: new match requests coming in
  useEffect(() => {
    if (!myProfileId) return;
    const supabase = createClient();

    const reqChannel = supabase
      .channel(`inbox-requests-${myProfileId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'match_requests',
        filter: `to_user=eq.${myProfileId}`,
      }, () => {
        fetchInbox();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'match_requests',
        filter: `to_user=eq.${myProfileId}`,
      }, () => {
        fetchInbox();
      })
      .subscribe();

    // Realtime: new messages arrive — refresh inbox to update last_message + unread count
    const msgChannel = supabase
      .channel(`inbox-messages-${myProfileId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${myProfileId}`,
      }, () => {
        fetchInbox();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [myProfileId, fetchInbox]);

  const requests = items.filter(i => i.type === 'match_request' && i.status === 'pending');
  const chats = items.filter(i => i.type === 'conversation');
  const matches = chats;

  const handleAccept = async (requestId: string) => {
    try {
      const res = await api('/api/match/respond', {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, action: 'accept' }),
      });
      if (res.ok) {
        // Remove immediately from requests tab, then refresh to pick up the new conversation
        setItems(prev => prev.filter(i => i.id !== requestId));
        fetchInbox();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api('/api/match/respond', {
        method: 'POST',
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
      <div className="flex border-b border-[#252830] mb-6">
        {[
          { key: 'requests', label: 'DUO REQUESTS', icon: <UserCheck size={14} />, count: requests.length, activeColor: '#FF4655' },
          { key: 'chats', label: 'MESSAGES', icon: <MessageSquare size={14} />, count: chats.reduce((acc, c) => acc + (c.unread ?? 0), 0), activeColor: '#00E5FF' },
          { key: 'matches', label: 'MATCHES', icon: <Users size={14} />, count: 0, activeColor: '#FF7EB3' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'requests' | 'chats' | 'matches')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 relative ${tab === t.key ? 'border-b-2' : 'border-transparent text-[#8B90A8] hover:text-[#ECF0F8]'}`}
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              ...(tab === t.key ? { borderColor: t.activeColor, color: t.activeColor } : {}),
            }}
          >
            {t.icon} {t.label}
            {t.count > 0 && (
              <span
                className="text-white text-[9px] font-mono w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: t.activeColor }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#171A22] border border-[#252830] h-20 animate-pulse" />
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
              <p className="text-[#525566] text-sm mt-1">Go browse and send some requests</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-[#171A22] border border-[#252830] p-4 flex items-center gap-4">
                {/* Clickable avatar — opens profile */}
                <button
                  className="w-12 h-12 bg-[#11141B] border border-[#252830] overflow-hidden flex-shrink-0 hover:border-[#FF4655]/40 transition-colors"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                  onClick={() => setViewingProfile(buildProfile(req.user))}
                  title="View profile"
                >
                  {req.user.avatar_url ? (
                    <img src={req.user.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[#525566]">
                      {req.user.riot_id?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Clickable name — opens profile */}
                  <div className="flex items-center gap-1.5">
                    <button
                      className="text-sm text-[#E8EAF0] hover:text-[#FF4655] transition-colors text-left truncate"
                      onClick={() => setViewingProfile(buildProfile(req.user))}
                    >
                      {req.user.riot_id}#{req.user.riot_tag}
                    </button>
                    {req.user.is_verified && (
                      <div title="Verified"><VerifiedBadge size={13} /></div>
                    )}
                  </div>
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
                      className="px-3 py-1.5 text-xs font-bold uppercase border border-[#252830] text-[#525566] hover:border-[#525566] transition-all"
                      style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={() => handleAccept(req.id)}
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
      ) : tab === 'matches' ? (
        <div className="space-y-2">
          {matches.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="text-[#2A2D35] mx-auto mb-3" />
              <p className="font-bold text-xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NO MATCHES YET
              </p>
              <p className="text-[#525566] text-sm mt-1">Match with someone to start chatting</p>
            </div>
          ) : (
            matches.map(chat => (
              <div
                key={chat.id}
                className="flex items-center gap-4 border p-4 transition-all cursor-pointer bg-[#171A22] border-[#252830] hover:border-[#00E5FF]/20"
                onClick={() => router.push(`/inbox/${chat.conversation_id}`)}
              >
                <button
                  className="w-12 h-12 bg-[#11141B] border border-[#252830] overflow-hidden flex-shrink-0 hover:border-[#00E5FF]/40 transition-colors"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                  onClick={e => { e.stopPropagation(); setViewingProfile(buildProfile(chat.user)); }}
                  title="View profile"
                >
                  {chat.user.avatar_url ? (
                    <img src={chat.user.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[#525566]">
                      {chat.user.riot_id?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      className="text-sm text-[#E8EAF0] hover:text-[#00E5FF] transition-colors text-left"
                      onClick={e => { e.stopPropagation(); setViewingProfile(buildProfile(chat.user)); }}
                    >
                      {chat.user.riot_id}#{chat.user.riot_tag}
                    </button>
                    {chat.user.is_verified && (
                      <div title="Verified"><VerifiedBadge size={13} /></div>
                    )}
                  </div>
                  {chat.last_message && (
                    <p className="text-xs truncate mt-0.5 text-[#525566]">{chat.last_message}</p>
                  )}
                </div>
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
              <p className="text-[#525566] text-sm mt-1">Match with someone to start chatting</p>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`flex items-center gap-4 border p-4 transition-all cursor-pointer ${
                  chat.unread && chat.unread > 0
                    ? 'bg-[#1A1F2E] border-[#00E5FF]/40 hover:border-[#00E5FF]/60'
                    : 'bg-[#171A22] border-[#252830] hover:border-[#00E5FF]/20'
                }`}
                onClick={() => router.push(`/inbox/${chat.conversation_id}`)}
              >
                {/* Avatar — click opens profile */}
                <button
                  className="w-12 h-12 bg-[#11141B] border border-[#252830] overflow-hidden flex-shrink-0 hover:border-[#00E5FF]/40 transition-colors"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                  onClick={e => { e.stopPropagation(); setViewingProfile(buildProfile(chat.user)); }}
                  title="View profile"
                >
                  {chat.user.avatar_url ? (
                    <img src={chat.user.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[#525566]">
                      {chat.user.riot_id?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Name — click opens profile */}
                  <div className="flex items-center gap-1.5">
                    <button
                      className="text-sm text-[#E8EAF0] hover:text-[#00E5FF] transition-colors text-left"
                      onClick={e => { e.stopPropagation(); setViewingProfile(buildProfile(chat.user)); }}
                    >
                      {chat.user.riot_id}#{chat.user.riot_tag}
                    </button>
                    {chat.user.is_verified && (
                      <div title="Verified"><VerifiedBadge size={13} /></div>
                    )}
                  </div>
                  {chat.last_message && (
                    <p className={`text-xs truncate mt-0.5 ${chat.unread && chat.unread > 0 ? 'text-[#E8EAF0] font-semibold' : 'text-[#525566]'}`}>
                      {chat.last_message}
                    </p>
                  )}
                </div>

                {chat.unread && chat.unread > 0 ? (
                  <span className="bg-[#00E5FF] text-[#0B0D11] text-[9px] font-bold font-mono w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {chat.unread > 9 ? '9+' : chat.unread}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile modal (from requests or chats) */}
      {viewingProfile && (
        <ProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onSendRequest={() => {}}
          onPass={() => {}}
          requestStatus="matched"
        />
      )}
    </div>
  );
}
