'use client';
import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, RefreshCw, X, Heart, Flag, Undo2, Crown } from 'lucide-react';
import { Profile, REGIONS, ROLES, getRankTier } from '@/types';
import ProfileModal from '@/components/profile/ProfileModal';
import ReportModal from '@/components/shared/ReportModal';
import ProfileBorder from '@/components/shared/ProfileBorder';
import BadgesRow from '@/components/shared/BadgesRow';
import UsernameDisplay from '@/components/shared/UsernameDisplay';
import { useApi } from '@/lib/api';
import Link from 'next/link';

const RANKS_TIERS = ['Any', 'Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

const RANK_COLORS: Record<string, string> = {
  unranked: '#525566', iron: '#8B8FA8', bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#00C8FF', diamond: '#A855F7', ascendant: '#22C55E',
  immortal: '#FF4655', radiant: '#FFE84D',
};

interface Filters {
  region: string;
  rank_tier: string;
  role: string;
  gender: string;
  age_min: number;
  age_max: number;
}

export default function MatchPage() {
  const api = useApi();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'pending' | 'matched' | 'declined'>>({});
  const [lastPassedProfile, setLastPassedProfile] = useState<Profile | null>(null);

  const DEFAULT_FILTERS: Filters = { region: '', rank_tier: 'Any', role: '', gender: '', age_min: 18, age_max: 99 };

  const savedFilters = (): Filters => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    try {
      const raw = localStorage.getItem('browse_filters');
      if (raw) return { ...DEFAULT_FILTERS, ...JSON.parse(raw) as Filters };
    } catch {}
    return DEFAULT_FILTERS;
  };

  // pendingFilters = what's currently selected in the UI (not yet applied)
  // appliedFilters = what the backend is actually queried with
  const [pendingFilters, setPendingFilters] = useState<Filters>(savedFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(savedFilters);
  const [includePassed, setIncludePassed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportingProfile, setReportingProfile] = useState<Profile | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [apiMisconfig, setApiMisconfig] = useState(false);
  const [myIsSupporter, setMyIsSupporter] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [browseMeta, setBrowseMeta] = useState<{ poolSize: number | null; filtersActive: boolean | null }>({
    poolSize: null,
    filtersActive: null,
  });

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    if (typeof window === 'undefined') return;
    const isLocalSite = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalSite && /localhost|127\.0\.0\.1/.test(raw)) {
      setApiMisconfig(true);
    }
  }, []);

  useEffect(() => {
    api('/api/subscription/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMyIsSupporter(d.is_supporter ?? false); })
      .catch(() => {});
  }, [api]);

  const fetchProfiles = useCallback(async (pageNum: number, currentFilters: Filters, withPassed = false) => {
    setLoading(true);
    setFetchError(null);
    setNeedsOnboarding(false);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '12',
        ...(currentFilters.region && { region: currentFilters.region }),
        ...(currentFilters.rank_tier && currentFilters.rank_tier !== 'Any' && { rank_tier: currentFilters.rank_tier }),
        ...(currentFilters.role && { role: currentFilters.role }),
        ...(currentFilters.gender && { gender: currentFilters.gender }),
        ...(currentFilters.age_min > 18 && { age_min: String(currentFilters.age_min) }),
        ...(currentFilters.age_max < 99 && { age_max: String(currentFilters.age_max) }),
        ...(withPassed && { includePassed: 'true' }),
      });
      const res = await api(`/api/match?${params}`);
      if (!res.ok) {
        if (res.status === 404) {
          setNeedsOnboarding(true);
          setProfiles([]);
          return;
        }
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (body.code === 'PROFILE_INCOMPLETE') {
            setNeedsOnboarding(true);
            setProfiles([]);
            return;
          }
        }
        throw new Error(
          res.status === 401 ? 'Sign in again (session invalid).' : `Server returned ${res.status}.`,
        );
      }
      const data = await res.json();
      if (pageNum === 0) {
        setProfiles(data.profiles);
        setCurrentIndex(0);
      } else {
        setProfiles(prev => [...prev, ...(data.profiles as Profile[])]);
      }
      setHasMore(data.hasMore);
      setRequestStatuses(prev => ({ ...prev, ...data.requestStatuses }));
      setBrowseMeta({
        poolSize: typeof data.poolSize === 'number' ? data.poolSize : null,
        filtersActive: typeof data.filtersActive === 'boolean' ? data.filtersActive : null,
      });
    } catch (e) {
      console.error(e);
      if (pageNum === 0) {
        setProfiles([]);
        setBrowseMeta({ poolSize: null, filtersActive: null });
        const msg =
          e instanceof Error
            ? e.message
            : 'Could not reach the API. Check NEXT_PUBLIC_API_URL in your deploy settings.';
        setFetchError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Persist applied filters to localStorage
  useEffect(() => {
    try { localStorage.setItem('browse_filters', JSON.stringify(appliedFilters)); } catch {}
  }, [appliedFilters]);

  useEffect(() => {
    // Re-fetch when applied filters change; always reset includePassed on filter change
    setIncludePassed(false);
    setPage(0);
    fetchProfiles(0, appliedFilters, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, fetchProfiles]);

  // Load more when approaching the end
  useEffect(() => {
    const nearEnd =
      profiles.length >= 4
        ? currentIndex >= profiles.length - 3
        : currentIndex >= profiles.length - 1 && profiles.length > 0;
    if (profiles.length > 0 && nearEnd && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProfiles(nextPage, appliedFilters, includePassed);
    }
  }, [currentIndex, profiles.length, hasMore, loading, page, appliedFilters, includePassed, fetchProfiles]);

  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const pendingActive = JSON.stringify(pendingFilters) !== JSON.stringify(DEFAULT_FILTERS);
  const appliedActive = JSON.stringify(appliedFilters) !== JSON.stringify(DEFAULT_FILTERS);

  const advance = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSendRequest = async (profileId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api('/api/match', {
        method: 'POST',
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
    const passed = profiles.find(p => p.id === profileId) ?? null;
    try {
      await api('/api/match/pass', {
        method: 'POST',
        body: JSON.stringify({ to_user_profile_id: profileId }),
      });
      setLastPassedProfile(passed);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      advance();
    }
  };

  const handleUndo = async () => {
    if (!lastPassedProfile || actionLoading) return;
    setActionLoading(true);
    try {
      await api('/api/match/pass', {
        method: 'DELETE',
        body: JSON.stringify({ to_user_profile_id: lastPassedProfile.id }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLastPassedProfile(null);
      setCurrentIndex(prev => Math.max(0, prev - 1));
      setActionLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex] ?? null;
  const isDone = !loading && !fetchError && currentIndex >= profiles.length;

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
            onClick={() => {
              setIncludePassed(false);
              setPage(0);
              fetchProfiles(0, appliedFilters, false);
            }}
            className="btn-ghost p-2"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 btn-ghost relative ${showFilters || appliedActive ? 'border-[#FF4655] text-[#FF4655]' : ''}`}
          >
            <SlidersHorizontal size={14} />
            FILTERS
            {appliedActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF4655]" />
            )}
          </button>
        </div>
      </div>

      {apiMisconfig && (
        <div className="mb-4 p-3 border border-amber-600/50 bg-amber-950/40 text-amber-200/90 text-xs font-mono leading-relaxed">
          NEXT_PUBLIC_API_URL is unset or points at localhost while the site is not on localhost. The Browse page cannot reach your API — set NEXT_PUBLIC_API_URL on Netlify to your backend URL (e.g. https://api.yourdomain.com) and redeploy.
        </div>
      )}
      {needsOnboarding && !loading && (
        <div className="text-center py-16 max-w-md mx-auto px-2">
          <p className="font-extrabold text-2xl uppercase text-[#E8EAF0] mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            PROFILE INCOMPLETE
          </p>
          <p className="text-[#8B90A8] text-sm mb-6 leading-relaxed">
            You need a profile picture before you can browse. Upload one in your profile settings.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#FF4655] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#FF5F6D] transition-colors"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
          >
            GO TO PROFILE
          </Link>
        </div>
      )}
      {fetchError && !loading && (
        <div className="mb-4 p-3 border border-[#FF4655]/40 bg-[#FF4655]/10 text-[#E8EAF0] text-sm">
          {fetchError}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-[#171A22] border border-[#252830] p-4 mb-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label block mb-2">REGION</label>
              <select
                className="w-full bg-[#11141B] border border-[#252830] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
                value={pendingFilters.region}
                onChange={e => setPendingFilters(prev => ({ ...prev, region: e.target.value }))}
              >
                <option value="">ANY</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-2">RANK TIER</label>
              <select
                className="w-full bg-[#11141B] border border-[#252830] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
                value={pendingFilters.rank_tier}
                onChange={e => setPendingFilters(prev => ({ ...prev, rank_tier: e.target.value }))}
              >
                {RANKS_TIERS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-2">ROLE</label>
              <select
                className="w-full bg-[#11141B] border border-[#252830] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
                value={pendingFilters.role}
                onChange={e => setPendingFilters(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="">ANY</option>
                {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-2">GENDER</label>
              <select
                className="w-full bg-[#11141B] border border-[#252830] px-2 py-1.5 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
                value={pendingFilters.gender}
                onChange={e => setPendingFilters(prev => ({ ...prev, gender: e.target.value }))}
              >
                <option value="">ANY</option>
                <option value="Male">MALE</option>
                <option value="Female">FEMALE</option>
                <option value="Other">OTHER</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label block mb-2">
              AGE RANGE
              {(pendingFilters.age_min > 18 || pendingFilters.age_max < 99) ? (
                <span className="text-[#FF4655] ml-2">{pendingFilters.age_min} – {pendingFilters.age_max}</span>
              ) : (
                <span className="text-[#525566] ml-2">ANY (18 – 99)</span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#525566] flex-shrink-0">18</span>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#8B8FA8] w-6">MIN</span>
                  <input
                    type="range"
                    min={18}
                    max={pendingFilters.age_max}
                    value={pendingFilters.age_min}
                    onChange={e => setPendingFilters(prev => ({ ...prev, age_min: Number(e.target.value) }))}
                    className="flex-1 accent-[#FF4655] h-1"
                  />
                  <span className="font-mono text-[10px] text-[#E8EAF0] w-5 text-right">{pendingFilters.age_min}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#8B8FA8] w-6">MAX</span>
                  <input
                    type="range"
                    min={pendingFilters.age_min}
                    max={99}
                    value={pendingFilters.age_max}
                    onChange={e => setPendingFilters(prev => ({ ...prev, age_max: Number(e.target.value) }))}
                    className="flex-1 accent-[#FF4655] h-1"
                  />
                  <span className="font-mono text-[10px] text-[#E8EAF0] w-5 text-right">{pendingFilters.age_max}</span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-[#525566] flex-shrink-0">99</span>
            </div>
          </div>

          {/* Apply / Clear */}
          <div className="flex gap-2 pt-1 border-t border-[#252830]">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-bold uppercase font-mono border border-[#252830] text-[#525566] hover:border-[#525566] hover:text-[#E8EAF0] transition-colors"
            >
              CLEAR
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 py-2 text-xs font-bold uppercase font-mono bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
            >
              APPLY FILTERS
            </button>
          </div>
        </div>
      )}

      {/* Supporter banner for non-supporters */}
      {!myIsSupporter && !bannerDismissed && (
        <div className="mb-4 p-3 border border-yellow-600/30 bg-yellow-950/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Crown size={14} className="text-yellow-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-yellow-400 font-bold text-xs uppercase font-mono tracking-wider">SUPPORTER PERKS</span>
              <p className="text-yellow-200/50 text-[10px] mt-0.5 font-mono">Priority placement · Gif permissions · Music on profile &amp; more — $5/mo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/profile" className="text-[10px] font-mono text-yellow-400 hover:text-yellow-300 border border-yellow-600/40 px-2 py-1 transition-colors">
              UPGRADE
            </Link>
            <button onClick={() => setBannerDismissed(true)} className="text-yellow-700 hover:text-yellow-500 transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Card area */}
      {loading && profiles.length === 0 ? (
        <div className="bg-[#171A22] border border-[#252830] h-[480px] animate-pulse"
          style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }} />
      ) : fetchError && profiles.length === 0 ? (
        <div className="text-center py-16 text-[#525566] text-sm">
          Fix the issue above, then tap refresh.
        </div>
      ) : isDone ? (
        <div className="text-center py-24 max-w-md mx-auto px-2">
          {profiles.length === 0 && browseMeta.poolSize === 0 && !browseMeta.filtersActive ? (
            <>
              <p className="font-extrabold text-2xl uppercase text-[#E8EAF0]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NO ONE TO SHOW YET
              </p>
              <p className="text-[#8B90A8] text-sm mt-3 leading-relaxed">
                The API is working, but the browse pool is empty. You need at least one other account that finished signup
                (18+ confirmed). People who never completed onboarding can appear in Admin but not here. Ask someone else to register,
                or in Supabase set <span className="font-mono text-[#00E5FF]/80">confirmed_18 = true</span> on test profiles.
              </p>
              <button
                onClick={() => { setIncludePassed(false); setPage(0); fetchProfiles(0, appliedFilters, false); }}
                className="mt-6 btn-ghost text-xs"
              >
                <RefreshCw size={12} className="inline mr-1" /> REFRESH
              </button>
            </>
          ) : profiles.length === 0 && browseMeta.poolSize === 0 && browseMeta.filtersActive ? (
            <>
              <p className="font-extrabold text-2xl uppercase text-[#E8EAF0]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NO MATCHES FOR FILTERS
              </p>
              <p className="text-[#8B90A8] text-sm mt-3">Try clearing filters or widening rank/region.</p>
              <button
                onClick={() => { setIncludePassed(false); setPage(0); fetchProfiles(0, appliedFilters, false); }}
                className="mt-6 btn-ghost text-xs"
              >
                <RefreshCw size={12} className="inline mr-1" /> REFRESH
              </button>
            </>
          ) : (
            <>
              <p className="text-[#8B90A8] text-sm leading-relaxed">
                looks like there are no more profiles left.{' '}
                {!includePassed ? (
                  <>
                    if you want you can{' '}
                    <button
                      className="underline text-[#E8EAF0] hover:text-[#FF4655] transition-colors"
                      onClick={() => {
                        setIncludePassed(true);
                        setPage(0);
                        fetchProfiles(0, appliedFilters, true);
                      }}
                    >
                      click this
                    </button>
                    {' '}to bring up everyone you passed. time to lower your standards.
                  </>
                ) : (
                  <>everyone you passed is already included.</>
                )}
              </p>
              <button
                onClick={() => { setIncludePassed(false); setPage(0); fetchProfiles(0, appliedFilters, false); }}
                className="mt-6 btn-ghost text-xs"
              >
                <RefreshCw size={12} className="inline mr-1" /> REFRESH
              </button>
            </>
          )}
        </div>
      ) : currentProfile ? (
        /* ProfileBorder must NOT have clipPath — clipPath clips box-shadow from animations.
           The border glows on the outer wrapper; the inner div gets the corner-clip shape. */
        <ProfileBorder
          border={currentProfile.profile_border ?? 'none'}
          color={currentProfile.profile_border_color ?? currentProfile.profile_accent_color ?? '#FF4655'}
        >
          <div className="bg-[#171A22] border border-[#252830]"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >

          {/* Avatar */}
          <div className="relative w-full aspect-square bg-[#11141B] overflow-hidden">
            {currentProfile.avatar_url ? (
              <img
                src={currentProfile.avatar_url}
                alt={currentProfile.riot_id ?? ''}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-extrabold text-8xl text-[#2A2D35]"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {currentProfile.riot_id?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {/* Region badge */}
            {currentProfile.region && (
              <div className="absolute top-3 right-3 bg-[#11141B]/80 border border-[#252830] px-2 py-0.5">
                <span className="font-mono text-[10px] text-[#8B8FA8]">{currentProfile.region}</span>
              </div>
            )}
            {/* Music indicator */}
            {currentProfile.is_supporter && currentProfile.profile_music_url && (() => {
              const mc = currentProfile.profile_accent_color ?? '#8B6FFF';
              return (
                <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5">
                  <style>{`@keyframes eq-bar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}`}</style>
                  <div className="flex items-end gap-[3px]" style={{ height: 16 }}>
                    {[0, 0.18, 0.09, 0.27].map((delay, i) => (
                      <span key={i} style={{
                        width: 3, height: '100%', display: 'block',
                        background: mc, borderRadius: 1,
                        transformOrigin: 'bottom',
                        animation: `eq-bar ${0.55 + i * 0.08}s ease-in-out ${delay}s infinite`,
                        boxShadow: `0 0 6px ${mc}`,
                      }} />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5"
                    style={{
                      color: mc,
                      background: '#11141Bcc',
                      textShadow: `0 0 8px ${mc}`,
                    }}>
                    ♫ their vibe
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Info */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-2xl uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    <UsernameDisplay
                      riotId={currentProfile.riot_id ?? null}
                      riotTag={currentProfile.riot_tag ?? null}
                      effect={currentProfile.username_effect ?? 'none'}
                      accentColor={currentProfile.profile_accent_color ?? '#FF4655'}
                      className="text-[#E8EAF0]"
                    />
                  </h2>
                  <BadgesRow
                    isVerified={currentProfile.is_verified}
                    isSupporter={currentProfile.is_supporter}
                    size={18}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {currentProfile.current_rank && (() => {
                    const accent = currentProfile.profile_accent_color;
                    const rankC = RANK_COLORS[getRankTier(currentProfile.current_rank)] ?? '#8B8FA8';
                    const c = accent ?? rankC;
                    return (
                      <span className="font-mono text-xs px-2 py-0.5 border"
                        style={{ color: c, borderColor: c, backgroundColor: `${c}15` }}>
                        {currentProfile.current_rank}
                      </span>
                    );
                  })()}
                  {currentProfile.role && (
                    <span className="font-mono text-xs border px-2 py-0.5"
                      style={{
                        color: currentProfile.profile_accent_color ?? '#8B8FA8',
                        borderColor: currentProfile.profile_accent_color ? `${currentProfile.profile_accent_color}60` : '#252830',
                      }}>
                      {currentProfile.role}
                    </span>
                  )}
                  {currentProfile.gender && (
                    <span className="font-mono text-xs text-[#8B8FA8] border border-[#252830] px-2 py-0.5">
                      {currentProfile.gender}
                    </span>
                  )}
                  {currentProfile.age != null && (
                    <span className="font-mono text-xs text-[#8B8FA8] border border-[#252830] px-2 py-0.5">
                      {currentProfile.age}yo
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
                  className="text-[#525566] hover:text-[#E8EAF0] transition-colors text-xs font-mono border border-[#252830] px-2 py-1 hover:border-[#525566]"
                >
                  VIEW
                </button>
              </div>
            </div>

            {/* Agents */}
            {currentProfile.agents && currentProfile.agents.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {currentProfile.agents.map(a => (
                  <span key={a} className="font-mono text-[10px] text-[#00E5FF] border border-[#00E5FF]/20 bg-[#00E5FF]/5 px-1.5 py-0.5">{a}</span>
                ))}
              </div>
            )}

            {currentProfile.about && (
              <p className="text-[#8B90A8] text-xs mb-4 leading-relaxed border-l-2 border-[#00E5FF]/30 pl-3">
                {currentProfile.about}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {lastPassedProfile && (
                <button
                  onClick={handleUndo}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 border border-[#252830] text-[#525566] hover:border-amber-500/50 hover:text-amber-400 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  title={`Undo pass on ${lastPassedProfile.riot_id}`}
                >
                  <Undo2 size={14} />
                </button>
              )}
              <button
                onClick={() => handlePass(currentProfile.id)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#252830] text-[#8B8FA8] hover:border-[#525566] hover:text-[#E8EAF0] transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
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
            <p className="text-center font-mono text-[9px] text-[#00E5FF]/30 mt-3">
              {currentIndex + 1} / {profiles.length}{hasMore ? '+' : ''}
            </p>
          </div>
          </div>
        </ProfileBorder>
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
