'use client';
import { useState, useEffect } from 'react';
import { useApi } from '@/lib/api';
import { createClient } from '@/lib/supabase';

export default function RankedAnnouncement() {
  const api = useApi();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const [statusRes, rankedRes] = await Promise.all([
          api('/api/chat-analysis/status'),
          api('/api/chat-analysis/ranked-status'),
        ]);
        if (!statusRes.ok || !rankedRes.ok) return;
        const status = await statusRes.json();
        const ranked = await rankedRes.json();
        // Show only if TextingTheory has been dismissed and ranked is not yet enabled
        if (status.has_seen_announcement && !ranked.ranked_enabled) {
          setShow(true);
        }
      } catch { /* ignore */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await api('/api/chat-analysis/toggle-ranked', { method: 'POST' });
    } catch { /* ignore */ }
    setShow(false);
    setLoading(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="bg-[#1A1D24] border border-[#FF4655]/40 p-6 max-w-md w-full relative"
        style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)', borderTop: '3px solid #FF4655' }}
      >
        <div className="absolute top-0 left-0 right-0 h-16 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, #FF4655, transparent)' }} />

        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[#FF4655]">// RANKED MODE</span>
        </div>
        <h2
          className="font-extrabold text-2xl uppercase text-[#E8EAF0] mb-3"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          RANKED MODE IS HERE 🏆
        </h2>
        <p className="text-[#8B90A8] text-sm leading-relaxed mb-4">
          Your messages now have stakes. Turn on Ranked Mode to earn RR with every message. Climb from Iron to Radiant. The best texters make the leaderboard.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-black uppercase text-white transition-all disabled:opacity-50"
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              background: '#FF4655',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            }}
          >
            {loading ? 'ENABLING...' : 'ENABLE RANKED'}
          </button>
          <button
            onClick={() => setShow(false)}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold uppercase border border-[#252830] text-[#525566] hover:border-[#525566] transition-all disabled:opacity-50"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            NOT NOW
          </button>
        </div>
      </div>
    </div>
  );
}
