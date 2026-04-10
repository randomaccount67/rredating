'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, UserCheck, MessageSquare, Heart } from 'lucide-react';

interface Notification {
  id: string;
  type: 'match_request' | 'matched' | 'new_message';
  related_user: {
    riot_id: string | null;
    riot_tag: string | null;
  } | null;
  read: boolean;
  created_at: string;
  conversation_id?: string;
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  match_request: <UserCheck size={14} className="text-[#FF4655]" />,
  matched: <Heart size={14} className="text-green-400" />,
  new_message: <MessageSquare size={14} className="text-blue-400" />,
};

const NOTIF_TEXT: Record<string, (name: string) => string> = {
  match_request: (name) => `${name} sent you a duo request`,
  matched: (name) => `You matched with ${name}! Check your inbox`,
  new_message: (name) => `New message from ${name}`,
};

export default function NotificationsPage() {
  const api = useApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await api('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifs();

    // Mark all read
    api('/api/notifications/read', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <span className="label text-[#FF4655]">// SYSTEM</span>
        <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          NOTIFICATIONS
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#1A1D24] border border-[#2A2D35] h-16 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24">
          <Bell size={32} className="text-[#2A2D35] mx-auto mb-3" />
          <p className="font-bold text-xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            NO NOTIFICATIONS
          </p>
          <p className="text-[#525566] text-sm mt-1 font-mono">You're all caught up, soldier</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const name = notif.related_user
              ? `${notif.related_user.riot_id}#${notif.related_user.riot_tag}`
              : 'Someone';
            const text = NOTIF_TEXT[notif.type]?.(name) ?? 'New notification';
            const href = notif.type === 'new_message' && notif.conversation_id
              ? `/inbox/${notif.conversation_id}`
              : notif.type === 'match_request'
              ? '/inbox'
              : '/inbox';

            return (
              <Link
                key={notif.id}
                href={href}
                className={`flex items-start gap-4 p-4 border transition-all ${
                  !notif.read
                    ? 'bg-[#1A1D24] border-[#FF4655]/20 hover:border-[#FF4655]/40'
                    : 'bg-[#13151A] border-[#2A2D35] hover:border-[#2A2D35]/80 opacity-60'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">{NOTIF_ICONS[notif.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E8EAF0]">{text}</p>
                  <p className="font-mono text-[10px] text-[#525566] mt-0.5">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-[#FF4655] rounded-full flex-shrink-0 mt-1" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
