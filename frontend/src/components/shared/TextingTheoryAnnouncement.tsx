'use client';
import { useState, useEffect } from 'react';
import { useApi } from '@/lib/api';
import { createClient } from '@/lib/supabase';

export default function TextingTheoryAnnouncement() {
  const api = useApi();
  const [show, setShow] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      api('/api/chat-analysis/status')
        .then(async res => {
          if (!res.ok) return;
          const d = await res.json();
          if (!d.has_seen_announcement) setShow(true);
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = async () => {
    setActing(true);
    try { await api('/api/chat-analysis/dismiss-announcement', { method: 'POST' }); } catch { /* ignore */ }
    setShow(false);
  };

  const tryIt = async () => {
    setActing(true);
    try {
      await api('/api/chat-analysis/toggle', { method: 'POST' });
      await api('/api/chat-analysis/dismiss-announcement', { method: 'POST' });
    } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="bg-[#1A1D24] border border-[#2A2D35] p-6 max-w-md w-full relative"
        style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)', borderTop: '3px solid #1BADA6' }}
      >
        {/* Teal top glow */}
        <div className="absolute top-0 left-0 right-0 h-16 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, #1BADA6, transparent)' }} />

        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[#1BADA6]">// NEW FEATURE</span>
        </div>
        <h2
          className="font-extrabold text-2xl uppercase text-[#E8EAF0] mb-3"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          TextingTheory Mode 🎯
        </h2>
        <p className="text-[#8B90A8] text-sm leading-relaxed mb-4">
          Ever wonder if your texts are brilliant plays or total blunders? Turn on TextingTheory Mode and every message gets rated like a chess move. Are you cooking or are you cooked?
        </p>
        <p className="text-[#525566] text-[11px] font-mono mb-5 border-l-2 border-[#252830] pl-3">
          When enabled, messages are routed through Google Gemini for analysis. You can turn this off anytime in Settings.
        </p>

        <div className="flex gap-3">
          <button
            onClick={tryIt}
            disabled={acting}
            className="flex-1 py-2.5 text-sm font-black uppercase text-white transition-all disabled:opacity-50"
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              background: '#1BADA6',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            }}
          >
            TRY IT
          </button>
          <button
            onClick={dismiss}
            disabled={acting}
            className="flex-1 py-2.5 text-sm font-bold uppercase border border-[#252830] text-[#525566] hover:border-[#525566] transition-all disabled:opacity-50"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            MAYBE LATER
          </button>
        </div>
      </div>
    </div>
  );
}
