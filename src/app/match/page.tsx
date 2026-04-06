'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, RefreshCw, X, Heart, Flag } from 'lucide-react';
import { Profile, REGIONS, ROLES, getRankTier } from '@/types';
import ProfileModal from '@/components/profile/ProfileModal';
import ReportModal from '@/components/ReportModal';
import Image from 'next/image';

const RANKS_TIERS = ['Any', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

const RANK_COLORS: Record<string, string> = {
  iron: '#8B8FA8', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#00C8FF', diamond: '#A855F7', ascendant: '#22C55E',
  immortal: '#FF4655', radiant: '#FFE84D',
};

interface Filters {
  region: string;
  rank_tier: string;
  role: string;
  gender: string;
  mic_only: boolean;
}

export default function MatchPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'pending' | 'matched' | 'declined'>>({});
  const [filters, setFilters] = useState<Filters>({ region: '', rank_tier: '', role: '', gender: '', mic_only: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [reportingProfile, setReportingProfile] = useState<Profile | null>(null);

  const fetchProfiles = useCallback(async (pageNum: number, currentFilters: Filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '12',
        ...(currentFilters.region && { region: currentFilters.region }),
        ...(currentFilters.rank_tier && currentFilters.rank_tier !== 'Any' && { rank_tier: currentFilters.rank_tier }),
        ...(currentFilters.role && { role: currentFilters.role }),
        ...(currentFilters.gender && { gender: currentFilters.gender }),
        ...(currentFilters.mic_only && { mic_only: '1' }),
      });
      const res = await fetch(`/api/match?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (pageNum === 0) {
        setProfiles(data.profiles);
        setCurrentIndex(0);
      } else {
        setProfiles(prev => [...prev, ...data.profiles]);
      }
      setHasMore(data.hasMore);
      setRequestStatuses(prev => ({ ...prev, ...data.requestStatuses }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchProfiles(0, filters);
  }, [filters, fetchProfiles]);

  // Load more when approaching the end
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length - 3 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProfiles(nextPage, filters);
    }
  }, [currentIndex, profiles.length, hasMore, loading, page, filters, fetchProfiles]);

  const advance = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSendRequest = async (profileId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_profile_id: profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequestStatuses(prev => ({ ...prev, [profileId]: data.status }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      advance();
    }
  };

  const handlePass = async (profileId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await fetch('/api/match/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_profile_id: profileId }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      advance();
    }
  };

  const currentProfile = profiles[currentIndex] ?? null;
  const isDone = !loading && currentIndex >= profiles.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="label text-[#FF4655]">// ACTIVE PLAYERS</span>
          <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            FIND YOUR DUO
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(0); fetchProfiles(0, filters); }}
            className="btn-ghost p-2"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 btn-ghost ${showFilters ? 'border-[#FF4655] text-[#FF4655]' : ''}`}
          >
            <SlidersHorizontal size={14} />
            FILTERS
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label block mb-2">REGION</label>
            <select
              className="w-full bg-[#13151A] border border-[#2A2D35] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
              value={filters.region}
              onChange={e => setFilters(prev => ({ ...prev, region: e.target.value }))}
            >
              <option value="">ANY</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label block mb-2">RANK TIER</label>
            <select
              className="w-full bg-[#13151A] border border-[#2A2D35] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
              value={filters.rank_tier}
              onChange={e => setFilters(prev => ({ ...prev, rank_tier: e.target.value }))}
            >
              {RANKS_TIERS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label block mb-2">ROLE</label>
            <select
              className="w-full bg-[#13151A] border border-[#2A2D35] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
              value={filters.role}
              onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="">ANY</option>
              {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label block mb-2">GENDER</label>
            <select
              className="w-full bg-[#13151A] border border-[#2A2D35] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
              value={filters.gender}
              onChange={e => setFilters(prev => ({ ...prev, gender: e.target.value }))}
            >
              <option value="">ANY</option>
              <option value="Male">MALE</option>
              <option value="Female">FEMALE</option>
              <option value="Other">OTHER</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setFilters(prev => ({ ...prev, mic_only: !prev.mic_only }))}
                className={`w-8 h-4 border transition-all relative cursor-pointer ${filters.mic_only ? 'border-[#FF4655] bg-[#FF4655]/20' : 'border-[#2A2D35]'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 transition-all ${filters.mic_only ? 'bg-[#FF4655] left-4' : 'bg-[#525566] left-0.5'}`} />
              </div>
              <span className="label">MIC ONLY</span>
            </label>
          </div>
        </div>
      )}

      {/* Card area */}
      {loading && profiles.length === 0 ? (
        <div className="bg-[#1A1D24] border border-[#2A2D35] h-[480px] animate-pulse"
          style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }} />
      ) : isDone ? (
        <div className="text-center py-24">
          <p className="font-extrabold text-3xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            NO MORE PLAYERS
          </p>
          <p className="text-[#525566] text-sm mt-2 font-mono">adjust your filters or check back later</p>
          <button
            onClick={() => { setPage(0); fetchProfiles(0, filters); }}
            className="mt-6 btn-ghost text-xs"
          >
            <RefreshCw size={12} className="inline mr-1" /> REFRESH
          </button>
        </div>
      ) : currentProfile ? (
        <div className="bg-[#1A1D24] border border-[#2A2D35]"
          style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>

          {/* Avatar */}
          <div className="relative w-full aspect-square bg-[#13151A] overflow-hidden"
            style={{ maxHeight: '340px' }}>
            {currentProfile.avatar_url ? (
              <Image
                src={currentProfile.avatar_url}
                alt={currentProfile.riot_id ?? ''}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-extrabold text-8xl text-[#2A2D35]"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {currentProfile.riot_id?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {/* Region badge */}
            {currentProfile.region && (
              <div className="absolute top-3 right-3 bg-[#13151A]/80 border border-[#2A2D35] px-2 py-0.5">
                <span className="font-mono text-[10px] text-[#8B8FA8]">{currentProfile.region}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-extrabold text-2xl uppercase text-[#E8EAF0]"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {currentProfile.riot_id ?? 'UNKNOWN'}
                  <span className="text-[#525566] font-normal text-lg ml-1">#{currentProfile.riot_tag}</span>
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {currentProfile.current_rank && (
                    <span className="font-mono text-xs px-2 py-0.5 border"
                      style={{
                        color: RANK_COLORS[getRankTier(currentProfile.current_rank)] ?? '#8B8FA8',
                        borderColor: RANK_COLORS[getRankTier(currentProfile.current_rank)] ?? '#2A2D35',
                        backgroundColor: `${RANK_COLORS[getRankTier(currentProfile.current_rank)] ?? '#8B8FA8'}15`,
                      }}>
                      {currentProfile.current_rank}
                    </span>
                  )}
                  {currentProfile.role && (
                    <span className="font-mono text-xs text-[#8B8FA8] border border-[#2A2D35] px-2 py-0.5">
                      {currentProfile.role}
                    </span>
                  )}
                  {currentProfile.gender && (
                    <span className="font-mono text-xs text-[#8B8FA8] border border-[#2A2D35] px-2 py-0.5">
                      {currentProfile.gender}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportingProfile(currentProfile)}
                  className="text-[#525566] hover:text-[#FF4655] transition-colors p-1"
                  title="Report this player"
                >
                  <Flag size={13} />
                </button>
                <button
                  onClick={() => setSelectedProfile(currentProfile)}
                  className="text-[#525566] hover:text-[#E8EAF0] transition-colors text-xs font-mono border border-[#2A2D35] px-2 py-1 hover:border-[#525566]"
                >
                  VIEW
                </button>
              </div>
            </div>

            {/* Agents */}
            {currentProfile.agents && currentProfile.agents.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {currentProfile.agents.map(a => (
                  <span key={a} className="font-mono text-[10px] text-[#525566] border border-[#2A2D35] px-1.5 py-0.5">{a}</span>
                ))}
              </div>
            )}

            {currentProfile.about && (
              <p className="text-[#8B8FA8] text-xs mb-4 leading-relaxed border-l-2 border-[#2A2D35] pl-3">
                {currentProfile.about}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handlePass(currentProfile.id)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566] hover:text-[#E8EAF0] transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <X size={16} /> PASS
              </button>
              <button
                onClick={() => handleSendRequest(currentProfile.id)}
                disabled={actionLoading || !!requestStatuses[currentProfile.id]}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <Heart size={16} />
                {requestStatuses[currentProfile.id] === 'matched' ? 'MATCHED' :
                 requestStatuses[currentProfile.id] === 'pending' ? 'REQUESTED' :
                 'SEND REQUEST'}
              </button>
            </div>

            {/* Progress indicator */}
            <p className="text-center font-mono text-[9px] text-[#2A2D35] mt-3">
              {currentIndex + 1} / {profiles.length}{hasMore ? '+' : ''}
            </p>
          </div>
        </div>
      ) : null}

      {/* Report modal */}
      {reportingProfile && (
        <ReportModal
          reportedProfileId={reportingProfile.id}
          reportedName={reportingProfile.riot_id ? `${reportingProfile.riot_id}#${reportingProfile.riot_tag}` : 'UNKNOWN'}
          onClose={() => setReportingProfile(null)}
        />
      )}

      {/* Profile modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSendRequest={(id) => { handleSendRequest(id); setSelectedProfile(null); }}
          onPass={(id) => { handlePass(id); setSelectedProfile(null); }}
          requestStatus={requestStatuses[selectedProfile.id] ?? null}
        />
      )}
    </div>
  );
}
