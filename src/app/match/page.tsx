'use client';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Profile, RANKS, REGIONS, ROLES } from '@/types';
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileModal from '@/components/profile/ProfileModal';

const RANKS_TIERS = ['Any', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

interface Filters {
  region: string;
  rank_tier: string;
  role: string;
  mic_only: boolean;
}

export default function MatchPage() {
  const { user } = useUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'pending' | 'matched' | 'declined'>>({});
  const [filters, setFilters] = useState<Filters>({ region: '', rank_tier: '', role: '', mic_only: false });

  const fetchProfiles = useCallback(async (pageNum: number, currentFilters: Filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '12',
        ...(currentFilters.region && { region: currentFilters.region }),
        ...(currentFilters.rank_tier && currentFilters.rank_tier !== 'Any' && { rank_tier: currentFilters.rank_tier }),
        ...(currentFilters.role && { role: currentFilters.role }),
        ...(currentFilters.mic_only && { mic_only: '1' }),
      });
      const res = await fetch(`/api/match?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (pageNum === 0) {
        setProfiles(data.profiles);
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

  const handleSendRequest = async (profileId: string) => {
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
    }
  };

  const handlePass = async (profileId: string) => {
    try {
      await fetch('/api/match/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_profile_id: profileId }),
      });
      setProfiles(prev => prev.filter(p => p.id !== profileId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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

      {/* Grid */}
      {loading && profiles.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#1A1D24] border border-[#2A2D35] h-64 animate-pulse"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }} />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-extrabold text-3xl uppercase text-[#2A2D35]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            NO PLAYERS FOUND
          </p>
          <p className="text-[#525566] text-sm mt-2 font-mono">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSendRequest={handleSendRequest}
                onPass={handlePass}
                onViewProfile={setSelectedProfile}
                requestStatus={requestStatuses[profile.id] ?? null}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchProfiles(nextPage, filters);
                }}
                disabled={loading}
                className="btn-outline px-8 py-3 text-sm"
              >
                {loading ? 'LOADING...' : 'LOAD MORE'}
              </button>
            </div>
          )}
        </>
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
