'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, Save, Check, AlertTriangle, UserX, Crown, Lock, ExternalLink, X, Eye } from 'lucide-react';
import { RANKS, REGIONS, ROLES, MUSIC_TAGS, AGENTS, Profile } from '@/types';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import SupporterBadge from '@/components/shared/SupporterBadge';
import ProfileModal from '@/components/profile/ProfileModal';
import { Suspense } from 'react';

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
      const tryQuality = (idx: number) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size <= 200 * 1024 || idx >= qualities.length - 1) {
            resolve(new File([blob], 'avatar.webp', { type: 'image/webp' }));
          } else { tryQuality(idx + 1); }
        }, 'image/webp', qualities[idx] ?? 0.35);
      };
      tryQuality(0);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

interface BlockedUser {
  blocked_id: string;
  created_at: string;
  profiles: { id: string; riot_id: string | null; riot_tag: string | null; avatar_url: string | null } | null;
}

interface SubStatus {
  is_supporter: boolean;
  supporter_since?: string | null;
  subscription_status?: string;
  current_period_end?: string;
}

const BORDERS = [
  { id: 'none', label: 'NONE' },
  { id: 'solid', label: 'SOLID' },
  { id: 'glitch', label: 'GLITCH' },
  { id: 'fire', label: 'FIRE' },
  { id: 'neon_pulse', label: 'NEON PULSE' },
  { id: 'rainbow', label: 'RAINBOW' },
  { id: 'static', label: 'STATIC' },
] as const;

const EFFECTS = [
  { id: 'none', label: 'NONE' },
  { id: 'gradient', label: 'GRADIENT' },
  { id: 'glitch', label: 'GLITCH' },
  { id: 'shimmer', label: 'SHIMMER' },
  { id: 'neon', label: 'NEON' },
] as const;

const THEMES = [
  { id: 'default', label: 'DEFAULT', bg: '#0B0D11', accent: '#FF4655' },
  { id: 'midnight', label: 'MIDNIGHT', bg: '#050A1A', accent: '#7B9EFF' },
  { id: 'ember', label: 'EMBER', bg: '#150800', accent: '#FF6B00' },
  { id: 'toxic', label: 'TOXIC', bg: '#020A02', accent: '#39FF14' },
  { id: 'phantom', label: 'PHANTOM', bg: '#0D0015', accent: '#BF5FFF' },
  { id: 'arctic', label: 'ARCTIC', bg: '#020D15', accent: '#00D4FF' },
] as const;

const BANNERS = [
  { id: 'none', label: 'NONE' },
  { id: 'geometric', label: 'GEOMETRIC' },
  { id: 'particles', label: 'PARTICLES' },
  { id: 'grid', label: 'GRID' },
  { id: 'waves', label: 'WAVES' },
  { id: 'stars', label: 'STARS' },
] as const;

function ProfilePageInner() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    gender: '', gender_other: '',
    riot_id: '', riot_tag: '', region: '', peak_rank: '', current_rank: '',
    role: '', agents: [] as string[], music_tags: [] as string[], about: '',
    favorite_artist: '', age: 18,
  });

  const [cosmetics, setCosmetics] = useState({
    profile_border: 'none',
    profile_border_color: '#FF4655',
    profile_accent_color: '#FF4655',
    profile_banner: 'none',
    username_effect: 'none',
    profile_theme: 'default',
  });

  const [musicSettings, setMusicSettings] = useState({
    profile_music_url: '',
    profile_music_start: 0,
    profile_music_volume: 15,
  });

  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      setJustSubscribed(true);
      // Remove the query param from URL
      router.replace('/profile');
    }
  }, [searchParams, router]);

  const fetchSubStatus = useCallback(async () => {
    try {
      const res = await api('/api/subscription/status');
      if (res.ok) setSubStatus(await res.json());
    } catch {}
  }, [api]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, blockedRes] = await Promise.all([
          api('/api/profile'),
          api('/api/block'),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.profile) {
            const p: Profile = data.profile;
            setProfile(p);
            const storedGender = p.gender ?? '';
            const isCustomGender = storedGender && !['Male', 'Female', 'Other'].includes(storedGender);
            setForm({
              gender: isCustomGender ? 'Other' : storedGender,
              gender_other: isCustomGender ? storedGender : '',
              riot_id: p.riot_id ?? '',
              riot_tag: p.riot_tag ?? '',
              region: p.region ?? '',
              peak_rank: p.peak_rank ?? '',
              current_rank: p.current_rank ?? '',
              role: p.role ?? '',
              agents: p.agents ?? [],
              music_tags: p.music_tags ?? [],
              about: p.about ?? '',
              favorite_artist: p.favorite_artist ?? '',
              age: p.age ?? 18,
            });
            setCosmetics({
              profile_border: p.profile_border ?? 'none',
              profile_border_color: p.profile_border_color ?? '#FF4655',
              profile_accent_color: p.profile_accent_color ?? '#FF4655',
              profile_banner: p.profile_banner ?? 'none',
              username_effect: p.username_effect ?? 'none',
              profile_theme: p.profile_theme ?? 'default',
            });
            setMusicSettings({
              profile_music_url: p.profile_music_url ?? '',
              profile_music_start: p.profile_music_start ?? 0,
              profile_music_volume: p.profile_music_volume ?? 15,
            });
          } else {
            router.replace('/onboarding');
            return;
          }
        }
        if (blockedRes.ok) {
          const bd = await blockedRes.json();
          setBlockedUsers(bd.blocked ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    fetchSubStatus();
  }, [router, fetchSubStatus]);

  const handleUnblock = async (blockedProfileId: string) => {
    setUnblocking(blockedProfileId);
    try {
      const res = await api('/api/block', {
        method: 'DELETE',
        body: JSON.stringify({ blocked_profile_id: blockedProfileId }),
      });
      if (res.ok) setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedProfileId));
    } catch {}
    finally { setUnblocking(null); }
  };

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key: 'agents' | 'music_tags', item: string, max?: number) => {
    setForm(prev => {
      const arr = prev[key] as string[];
      if (arr.includes(item)) return { ...prev, [key]: arr.filter(i => i !== item) };
      if (max && arr.length >= max) return prev;
      return { ...prev, [key]: [...arr, item] };
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Images only.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Max 8MB.'); return; }
    setAvatarPreview(URL.createObjectURL(file));
    const compressed = await compressImage(file);
    setAvatarFile(compressed);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let avatar_url = profile?.avatar_url ?? null;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const upRes = await api('/api/upload', { method: 'POST', body: fd });
        if (upRes.ok) { const { url } = await upRes.json(); avatar_url = url; }
      }
      const resolvedGender = form.gender === 'Other'
        ? (form.gender_other.trim() || 'Other')
        : form.gender || null;

      const body: Record<string, unknown> = {
        ...form, gender_other: undefined, gender: resolvedGender, avatar_url, age: form.age,
      };

      // Include cosmetics + music for supporters
      if (profile?.is_supporter) {
        Object.assign(body, cosmetics);
        // Normalize and include music URL
        const rawUrl = musicSettings.profile_music_url.trim();
        const spotifyMatch = rawUrl.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
        body.profile_music_url = spotifyMatch
          ? `https://open.spotify.com/track/${spotifyMatch[1]}`
          : (rawUrl === '' ? null : null); // only accept valid spotify URLs
        body.profile_music_start = musicSettings.profile_music_start;
        body.profile_music_volume = musicSettings.profile_music_volume;
      }

      const res = await api('/api/profile', { method: 'PUT', body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await api('/api/subscription/create-checkout', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {}
    finally { setSubscribing(false); }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await api('/api/subscription/portal', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {}
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await api('/api/subscription/cancel', { method: 'POST' });
      if (res.ok) {
        setShowCancelConfirm(false);
        await fetchSubStatus();
      }
    } catch {}
    finally { setCancelling(false); }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1B1814] border-2 border-[#2F2B24] h-96 animate-pulse" />
      </div>
    );
  }

  const isSupporter = profile?.is_supporter ?? false;
  const agentMax = isSupporter ? 5 : 3;
  const bioMax = isSupporter ? 560 : 280;
  const displayAvatar = avatarPreview ?? profile?.avatar_url;

  const section = "bg-[#1B1814] border-2 border-[#2F2B24]";
  const inputCls = "w-full bg-[#131009] border-2 border-[#2F2B24] px-3 py-2 text-sm focus:border-[#FF4655] outline-none text-[#F2EDE4] transition-colors";
  const chipBase = "px-3 py-1.5 text-xs font-mono border-2 transition-all cursor-pointer";
  const chipOff  = `${chipBase} border-[#2F2B24] text-[#857A6A] hover:border-[#3A3530] hover:text-[#F2EDE4]`;
  const chipOnLime = `${chipBase} border-[#FF4655] bg-[#FF4655]/8 text-[#FF4655]`;
  const chipOnCyan = `${chipBase} border-[#00D4FF] bg-[#00D4FF]/8 text-[#00D4FF]`;
  const chipOnPurple = `${chipBase} border-[#8B6FFF] bg-[#8B6FFF]/8 text-[#8B6FFF]`;
  const chipOnGold = `${chipBase} border-[#FFE84D] bg-[#FFE84D]/8 text-[#FFE84D]`;

  const SectionHeader = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-4 h-[2px]" style={{ background: color }} />
      <span className="font-mono text-[9px] tracking-widest uppercase text-[#4A4440]">{children}</span>
    </div>
  );

  const LockedOption = ({ label }: { label: string }) => (
    <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono border-2 border-[#2F2B24] text-[#3A3530] cursor-not-allowed">
      <Lock size={9} /> {label}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-[2px] bg-[#FF4655]" />
          <span className="font-mono text-[10px] text-[#4A4440] tracking-widest uppercase">MY PROFILE</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="font-black text-5xl uppercase text-[#F2EDE4]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            EDIT PROFILE
          </h1>
          {profile?.is_verified && <div title="Verified"><VerifiedBadge size={28} /></div>}
          {isSupporter && <div title="Supporter"><SupporterBadge size={24} /></div>}
        </div>
      </div>

      {/* Just subscribed toast */}
      {justSubscribed && (
        <div className="mb-4 flex items-center justify-between p-4 border-2 border-[#FFE84D]/40 bg-[#FFE84D]/5">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-[#FFE84D]" />
            <div>
              <p className="font-bold text-sm text-[#FFE84D]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                WELCOME, SUPPORTER!
              </p>
              <p className="text-xs text-[#857A6A]">Your perks and cosmetics are now unlocked.</p>
            </div>
          </div>
          <button onClick={() => setJustSubscribed(false)} className="text-[#4A4440] hover:text-[#F2EDE4]"><X size={14} /></button>
        </div>
      )}

      <div className="space-y-4">
        {/* ── Supporter Section ── */}
        <div className={section} style={{ borderTop: '3px solid #FFE84D' }}>
          <div className="p-5">
            <SectionHeader color="#FFE84D">SUPPORTER STATUS</SectionHeader>

            {isSupporter ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[#1A1600] border border-[#FFE84D]/20">
                  <Crown size={20} className="text-[#FFE84D] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[#FFE84D]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      ACTIVE SUPPORTER
                    </p>
                    {subStatus?.supporter_since && (
                      <p className="font-mono text-[10px] text-[#857A6A] mt-0.5">
                        SINCE {new Date(subStatus.supporter_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                      </p>
                    )}
                    {subStatus?.current_period_end && (
                      <p className="font-mono text-[10px] text-[#857A6A]">
                        RENEWS {new Date(subStatus.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleManageSubscription}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border-2 border-[#FFE84D]/40 text-[#FFE84D] hover:bg-[#FFE84D]/10 transition-all"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    <ExternalLink size={11} /> MANAGE BILLING
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-3 py-2 text-xs font-bold uppercase border-2 border-[#2F2B24] text-[#525566] hover:border-[#FF4655]/40 hover:text-[#FF4655] transition-all"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#857A6A]">
                  {[
                    'Animated profile borders', 'Username effects',
                    'Priority in Browse', '560 char bio (2×)',
                    '5 agents (vs 3)', 'Profile themes & banners',
                    'Supporter badge', 'Custom accent colors',
                  ].map(perk => (
                    <div key={perk} className="flex items-center gap-1.5">
                      <Crown size={9} className="text-[#FFE84D] flex-shrink-0" />
                      {perk}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full flex items-center justify-center gap-2 py-3 font-black text-sm uppercase tracking-wider bg-[#FFE84D] text-[#0B0D11] hover:bg-[#FFD700] transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '4px 4px 0px rgba(255,232,77,0.2)' }}
                >
                  <Crown size={16} />
                  {subscribing ? 'REDIRECTING...' : 'GO SUPPORTER — $5/MONTH'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cancel confirmation modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#1B1814] border-2 border-[#FF4655]/40 p-6 max-w-sm w-full">
              <h3 className="font-bold text-lg uppercase text-[#FF4655] mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                CANCEL SUBSCRIPTION?
              </h3>
              <p className="text-[#857A6A] text-sm mb-6">Your subscription will end at the close of your current billing period. You&apos;ll keep all perks until then.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  className="flex-1 py-2.5 text-sm font-bold uppercase border-2 border-[#2F2B24] text-[#525566] hover:border-[#525566] transition-all"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  KEEP IT
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-2.5 text-sm font-bold uppercase bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-all disabled:opacity-50"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {cancelling ? 'CANCELLING...' : 'CONFIRM CANCEL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Customize Profile (Cosmetics) ── */}
        <div className={section} style={{ borderTop: '3px solid #A78BFA' }}>
          <div className="p-5">
            <SectionHeader color="#A78BFA">COSMETICS</SectionHeader>
            {!isSupporter && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-[#0D0015] border border-[#A78BFA]/20 text-xs font-mono text-[#A78BFA]/70">
                <Lock size={11} /> Cosmetics require a Supporter subscription.
              </div>
            )}

            {/* Profile Border */}
            <div className="mb-5">
              <label className="label block mb-2">PROFILE BORDER</label>
              <div className="flex flex-wrap gap-2">
                {BORDERS.map(b => (
                  isSupporter ? (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setCosmetics(prev => ({ ...prev, profile_border: b.id }))}
                      className={cosmetics.profile_border === b.id ? chipOnPurple : chipOff}
                    >
                      {b.label}
                    </button>
                  ) : b.id === 'none' ? (
                    <button key={b.id} type="button" className={chipOff}>{b.label}</button>
                  ) : (
                    <LockedOption key={b.id} label={b.label} />
                  )
                ))}
              </div>
            </div>

            {/* Username Effect */}
            <div className="mb-5">
              <label className="label block mb-2">USERNAME EFFECT</label>
              <div className="flex flex-wrap gap-2">
                {EFFECTS.map(e => (
                  isSupporter ? (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setCosmetics(prev => ({ ...prev, username_effect: e.id }))}
                      className={cosmetics.username_effect === e.id ? chipOnPurple : chipOff}
                    >
                      {e.label}
                    </button>
                  ) : e.id === 'none' ? (
                    <button key={e.id} type="button" className={chipOff}>{e.label}</button>
                  ) : (
                    <LockedOption key={e.id} label={e.label} />
                  )
                ))}
              </div>
            </div>

            {/* Profile Banner */}
            <div className="mb-5">
              <label className="label block mb-2">PROFILE BANNER</label>
              <div className="flex flex-wrap gap-2">
                {BANNERS.map(b => (
                  isSupporter ? (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setCosmetics(prev => ({ ...prev, profile_banner: b.id }))}
                      className={cosmetics.profile_banner === b.id ? chipOnPurple : chipOff}
                    >
                      {b.label}
                    </button>
                  ) : b.id === 'none' ? (
                    <button key={b.id} type="button" className={chipOff}>{b.label}</button>
                  ) : (
                    <LockedOption key={b.id} label={b.label} />
                  )
                ))}
              </div>
            </div>

            {/* Profile Theme */}
            <div className="mb-5">
              <label className="label block mb-2">PROFILE THEME</label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map(t => (
                  isSupporter ? (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCosmetics(prev => ({ ...prev, profile_theme: t.id }))}
                      className={cosmetics.profile_theme === t.id ? chipOnGold : chipOff}
                      style={cosmetics.profile_theme === t.id ? { borderColor: t.accent, color: t.accent, background: `${t.accent}10` } : {}}
                    >
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: t.accent }} />
                      {t.label}
                    </button>
                  ) : t.id === 'default' ? (
                    <button key={t.id} type="button" className={chipOff}>{t.label}</button>
                  ) : (
                    <LockedOption key={t.id} label={t.label} />
                  )
                ))}
              </div>
            </div>

            {/* Colors */}
            {isSupporter && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-2">BORDER COLOR</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cosmetics.profile_border_color}
                      onChange={e => setCosmetics(prev => ({ ...prev, profile_border_color: e.target.value }))}
                      className="w-10 h-8 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <input
                      className={`${inputCls} flex-1 font-mono text-xs uppercase`}
                      value={cosmetics.profile_border_color}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCosmetics(prev => ({ ...prev, profile_border_color: v }));
                      }}
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <label className="label block mb-2">ACCENT COLOR</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cosmetics.profile_accent_color}
                      onChange={e => setCosmetics(prev => ({ ...prev, profile_accent_color: e.target.value }))}
                      className="w-10 h-8 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <input
                      className={`${inputCls} flex-1 font-mono text-xs uppercase`}
                      value={cosmetics.profile_accent_color}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCosmetics(prev => ({ ...prev, profile_accent_color: v }));
                      }}
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Profile Music */}
            <div className="mt-5 pt-5 border-t border-[#2F2B24]">
              <label className="label block mb-2">PROFILE MUSIC <span className="text-[#8B6FFF] text-[9px]">SUPPORTER</span></label>
              {isSupporter ? (
                <div className="space-y-3">
                  <div>
                    <input
                      className={`${inputCls} w-full font-mono text-xs`}
                      placeholder="https://open.spotify.com/track/..."
                      value={musicSettings.profile_music_url}
                      onChange={e => setMusicSettings(prev => ({ ...prev, profile_music_url: e.target.value }))}
                    />
                    <p className="font-mono text-[9px] text-[#4A4440] mt-1">Paste a Spotify track URL. Shown as a compact player on your profile.</p>
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[#4A4440] uppercase tracking-widest block mb-1">
                      START TIME — {musicSettings.profile_music_start}s
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={600}
                      value={musicSettings.profile_music_start}
                      onChange={e => setMusicSettings(prev => ({ ...prev, profile_music_start: Number(e.target.value) }))}
                      className="w-full accent-[#8B6FFF]"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[#4A4440] uppercase tracking-widest block mb-1">
                      VOLUME — {musicSettings.profile_music_volume}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicSettings.profile_music_volume}
                      onChange={e => setMusicSettings(prev => ({ ...prev, profile_music_volume: Number(e.target.value) }))}
                      className="w-full accent-[#8B6FFF]"
                    />
                  </div>
                  {musicSettings.profile_music_url && (
                    <button
                      type="button"
                      onClick={() => setMusicSettings(prev => ({ ...prev, profile_music_url: '' }))}
                      className="font-mono text-[10px] text-[#4A4440] hover:text-[#FF4655] transition-colors uppercase tracking-widest"
                    >
                      — Remove music
                    </button>
                  )}
                </div>
              ) : (
                <p className="font-mono text-[10px] text-[#4A4440] flex items-center gap-1">
                  <span>🔒</span> Profile music requires a Supporter subscription.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Avatar ── */}
        <div className={section} style={{ borderTop: '3px solid #FF4655' }}>
          <div className="p-5">
            <SectionHeader color="#FF4655">PROFILE PICTURE</SectionHeader>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 bg-[#131009] border-2 border-[#2F2B24] cursor-pointer hover:border-[#FF4655] overflow-hidden flex items-center justify-center transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={22} className="text-[#4A4440]" />
                )}
              </div>
              <div>
                <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs py-1.5 px-3">CHANGE PHOTO</button>
                <p className="label mt-1.5">MAX 8MB · IMAGES ONLY</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* ── Identity ── */}
        <div className={section} style={{ borderTop: '3px solid #00D4FF' }}>
          <div className="p-5">
            <SectionHeader color="#00D4FF">IDENTITY</SectionHeader>
            <div className="mb-4">
              <label className="label block mb-2">GENDER</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <button key={g} type="button" onClick={() => set('gender', g)}
                    className={form.gender === g ? chipOnLime : chipOff}>{g}</button>
                ))}
              </div>
              {form.gender === 'Other' && (
                <input className={inputCls} placeholder="describe yourself" value={form.gender_other}
                  onChange={e => set('gender_other', e.target.value)} maxLength={50} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label block mb-1.5">RIOT ID</label>
                <input className={inputCls} value={form.riot_id} onChange={e => set('riot_id', e.target.value)} placeholder="REYNA" />
              </div>
              <div>
                <label className="label block mb-1.5">TAG</label>
                <input className={inputCls} value={form.riot_tag} onChange={e => set('riot_tag', e.target.value)} placeholder="FRAG" maxLength={5} />
              </div>
            </div>
            <div className="mb-4">
              <label className="label block mb-1.5">REGION</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => set('region', r)}
                    className={form.region === r ? chipOnLime : chipOff}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label block mb-1.5">AGE</label>
              <div className="flex items-center gap-4">
                <input type="range" min="18" max="99" value={form.age}
                  onChange={e => set('age', parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#FF4655] cursor-pointer" />
                <span className="font-mono text-xl font-bold text-[#FF4655] w-10 text-center flex-shrink-0">{form.age}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Ranks ── */}
        <div className={section} style={{ borderTop: '3px solid #FFB800' }}>
          <div className="p-5">
            <SectionHeader color="#FFB800">COMPETITIVE</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1.5">PEAK RANK</label>
                <select className={inputCls} value={form.peak_rank} onChange={e => set('peak_rank', e.target.value)}>
                  <option value="">--</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">CURRENT RANK</label>
                <select className={inputCls} value={form.current_rank} onChange={e => set('current_rank', e.target.value)}>
                  <option value="">--</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Playstyle ── */}
        <div className={section} style={{ borderTop: '3px solid #FF3C3C' }}>
          <div className="p-5">
            <SectionHeader color="#FF3C3C">PLAYSTYLE</SectionHeader>
            <div className="mb-4">
              <label className="label block mb-1.5">ROLE</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(r => (
                  <button key={r} type="button" onClick={() => set('role', r)}
                    className={form.role === r ? chipOnLime : chipOff}
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label block mb-1.5">
                AGENTS (UP TO {agentMax})
                {isSupporter && <span className="text-[#FFE84D] ml-1 text-[9px]">↑ SUPPORTER PERK</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map(a => (
                  <button key={a} type="button" onClick={() => toggleArrayItem('agents', a, agentMax)}
                    className={form.agents.includes(a) ? chipOnCyan : chipOff}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Personality ── */}
        <div className={section} style={{ borderTop: '3px solid #8B6FFF' }}>
          <div className="p-5">
            <SectionHeader color="#8B6FFF">PERSONALITY</SectionHeader>
            <div className="mb-4">
              <label className="label block mb-1.5">MUSIC TASTE</label>
              <div className="flex flex-wrap gap-2">
                {MUSIC_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleArrayItem('music_tags', tag)}
                    className={form.music_tags.includes(tag) ? chipOnPurple : chipOff}>{tag}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="label block mb-1.5">FAVORITE ARTIST</label>
              <input className={inputCls} value={form.favorite_artist}
                onChange={e => set('favorite_artist', e.target.value)}
                placeholder="who are you listening to" maxLength={100} />
            </div>
            <div>
              <label className="label block mb-1.5">
                ABOUT ({bioMax} CHARS)
                {isSupporter && <span className="text-[#FFE84D] ml-1 text-[9px]">↑ SUPPORTER PERK</span>}
              </label>
              <textarea className={`${inputCls} resize-none`} rows={4} maxLength={bioMax}
                value={form.about} onChange={e => set('about', e.target.value)} />
              <p className="label text-right mt-1">{form.about.length}/{bioMax}</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-[#FF3C3C] text-sm bg-[#FF3C3C]/5 border-2 border-[#FF3C3C]/20 px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Save + Preview */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 font-black text-sm uppercase tracking-wider border-2 border-[#2F2B24] text-[#857A6A] hover:border-[#00E5FF]/40 hover:text-[#00E5FF] transition-all"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            title="Preview how your card looks to others"
          >
            <Eye size={16} /> PREVIEW
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 font-black text-sm uppercase tracking-wider transition-all bg-[#FF4655] text-white hover:bg-[#FF5F6D] disabled:opacity-50"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '4px 4px 0px rgba(255,70,85,0.25)' }}
          >
            {saved ? <><Check size={16} /> SAVED</> : saving ? 'SAVING...' : <><Save size={16} /> SAVE CHANGES</>}
          </button>
        </div>

        {/* Profile preview modal */}
        {showPreview && profile && (
          <ProfileModal
            profile={{
              ...profile,
              riot_id: form.riot_id || profile.riot_id,
              riot_tag: form.riot_tag || profile.riot_tag,
              avatar_url: avatarPreview ?? profile.avatar_url,
              about: form.about,
              agents: form.agents,
              role: form.role as Profile['role'],
              current_rank: form.current_rank as Profile['current_rank'],
              peak_rank: form.peak_rank as Profile['peak_rank'],
              region: form.region as Profile['region'],
              gender: form.gender === 'Other' ? (form.gender_other || 'Other') : form.gender,
              age: form.age,
              music_tags: form.music_tags as Profile['music_tags'],
              favorite_artist: form.favorite_artist,
              ...(isSupporter ? cosmetics : {}),
            }}
            onClose={() => setShowPreview(false)}
            onSendRequest={() => {}}
            onPass={() => {}}
            viewOnly
          />
        )}

        {/* Blocked Users */}
        <div className={section} style={{ borderTop: '3px solid #525566' }}>
          <div className="p-5">
            <SectionHeader color="#525566">BLOCKED USERS</SectionHeader>
            {blockedUsers.length === 0 ? (
              <p className="text-[#857A6A] text-sm">You haven&apos;t blocked anyone.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map(b => {
                  const p = b.profiles;
                  const name = p?.riot_id ? `${p.riot_id}#${p.riot_tag}` : 'Unknown User';
                  return (
                    <div key={b.blocked_id} className="flex items-center gap-3 bg-[#131009] border border-[#2F2B24] px-3 py-2">
                      <div className="w-8 h-8 bg-[#1B1814] border border-[#2F2B24] overflow-hidden flex-shrink-0">
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-mono text-[#525566] text-xs">
                            {p?.riot_id?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-xs text-[#857A6A] flex-1 truncate">{name}</span>
                      <button
                        onClick={() => handleUnblock(b.blocked_id)}
                        disabled={unblocking === b.blocked_id}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase border border-[#2F2B24] text-[#857A6A] hover:border-[#00E5FF]/40 hover:text-[#00E5FF] transition-all disabled:opacity-50"
                        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                      >
                        <UserX size={10} />
                        {unblocking === b.blocked_id ? '...' : 'UNBLOCK'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><div className="bg-[#1B1814] border-2 border-[#2F2B24] h-96 animate-pulse" /></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
