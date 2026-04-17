'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Target, Music, Calendar, Flag } from 'lucide-react';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import { Profile, getRankTier } from '@/types';
import ReportModal from '@/components/shared/ReportModal';
import SpotifyPlayer from '@/components/profile/SpotifyPlayer';

function RankBadge({ rank, label }: { rank: string; label: string }) {
  const tier = getRankTier(rank);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-[#525566] font-mono text-[8px] tracking-widest uppercase">{label}</span>
      <span className={`rank-${tier} text-xs font-mono px-2 py-1 inline-block`}>{rank}</span>
    </div>
  );
}

export default function PublicProfilePage() {
  const api = useApi();
  const params = useParams();
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api(`/api/profile/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) setP(d.profile);
        else setP(null);
      })
      .catch(() => setP(null))
      .finally(() => setLoading(false));
  }, [params.id, api]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1A1D24] border border-[#2A2D35] h-96 animate-pulse" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="font-bold text-xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          PROFILE NOT FOUND
        </p>
      </div>
    );
  }

  const displayName = p.riot_id ? `${p.riot_id}#${p.riot_tag}` : 'UNKNOWN#0000';

  const RANK_ACCENT: Record<string, string> = {
    unranked: '#525566', iron: '#7A7870', bronze: '#C47A30', silver: '#9BAFC4', gold: '#E8C200',
    platinum: '#00B8E0', diamond: '#9B71F4', ascendant: '#40D060',
    immortal: '#FF5070', radiant: '#FFD700',
  };
  const rankColor = p.current_rank ? (RANK_ACCENT[getRankTier(p.current_rank)] ?? '#FF4655') : '#FF4655';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-[#1A1D24] border border-[#2A2D35] overflow-hidden"
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)', borderTop: `3px solid ${rankColor}` }}>

        {/* Header */}
        <div className="p-8 border-b border-[#2A2D35]">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={displayName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-4xl text-[#525566]">
                  {p.riot_id?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-xl text-[#E8EAF0]">{displayName}</h1>
                {p.is_verified && (
                  <div title="Verified"><VerifiedBadge size={18} /></div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {p.region && <span className="text-[#525566] font-mono text-[10px] border border-[#2A2D35] px-2 py-0.5">{p.region}</span>}
                {p.gender && <span className="text-[#525566] font-mono text-[10px] border border-[#2A2D35] px-2 py-0.5">{p.gender}</span>}
                {p.role && (
                  <span className="flex items-center gap-1 text-[#8B8FA8] font-bold text-xs uppercase"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    <Target size={10} /> {p.role}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.is_online ? 'bg-green-500' : 'bg-[#525566]'}`} />
                  <span className="font-mono text-[9px] text-[#525566]">{p.is_online ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spotify embed */}
        {p.is_supporter && p.profile_music_url && (
          <div className="px-6 pt-4 pb-2 border-b border-[#2A2D35]">
            <p className="font-mono text-[9px] tracking-widest uppercase text-[#525566] mb-2">♫ their vibe</p>
            <SpotifyPlayer trackUrl={p.profile_music_url} />
          </div>
        )}

        {/* Ranks */}
        <div className="p-6 border-b border-[#2A2D35]">
          <span className="label mb-4 block">// COMPETITIVE</span>
          <div className="flex gap-6 flex-wrap">
            {p.peak_rank && <RankBadge rank={p.peak_rank} label="PEAK" />}
            {p.current_rank && <RankBadge rank={p.current_rank} label="CURRENT" />}
          </div>
        </div>

        {/* Agents */}
        {p.agents && p.agents.length > 0 && (
          <div className="p-6 border-b border-[#2A2D35]">
            <span className="label mb-3 block">// AGENTS</span>
            <div className="flex flex-wrap gap-2">
              {p.agents.map((agent: string) => (
                <span key={agent} className="bg-[#13151A] border border-[#2A2D35] px-3 py-1 font-mono text-xs text-[#E8EAF0]">{agent}</span>
              ))}
            </div>
          </div>
        )}

        {/* Music */}
        {p.music_tags && p.music_tags.length > 0 && (
          <div className="p-6 border-b border-[#2A2D35]">
            <span className="label mb-3 block flex items-center gap-1"><Music size={10} className="inline" /> MUSIC</span>
            <div className="flex flex-wrap gap-2">
              {p.music_tags.map((tag: string) => (
                <span key={tag} className="bg-[#13151A] border border-[#2A2D35] px-3 py-1 font-mono text-xs text-[#8B8FA8]">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        {p.about && (
          <div className="p-6 border-b border-[#2A2D35]">
            <span className="label mb-3 block">// ABOUT</span>
            <p className="text-[#8B8FA8] text-sm leading-relaxed">{p.about}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between text-[#525566]">
          <div className="flex items-center gap-2">
            <Calendar size={11} />
            <span className="font-mono text-[10px]">
              JOINED {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 text-[#525566] hover:text-[#FF4655] font-mono text-[10px] uppercase tracking-wider transition-colors"
            title="Report this profile"
          >
            <Flag size={11} /> Report
          </button>
        </div>
      </div>
      {showReport && (
        <ReportModal
          reportedProfileId={p.id}
          reportedName={displayName}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
