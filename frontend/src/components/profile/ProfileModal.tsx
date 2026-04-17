'use client';
import { X, Target, Music, Calendar } from 'lucide-react';
import { Profile, getRankTier } from '@/types';
import OnlineIndicator from '@/components/shared/OnlineIndicator';
import BadgesRow from '@/components/shared/BadgesRow';
import UsernameDisplay from '@/components/shared/UsernameDisplay';
import ProfileBanner from '@/components/shared/ProfileBanner';
import ProfileBorder from '@/components/shared/ProfileBorder';
import SpotifyPlayer from '@/components/profile/SpotifyPlayer';

interface ProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onSendRequest: (id: string) => void;
  onPass: (id: string) => void;
  requestStatus?: 'pending' | 'matched' | 'declined' | null;
  viewOnly?: boolean;
}

function RankBadge({ rank, label }: { rank: string; label: string }) {
  const tier = getRankTier(rank);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[8px] tracking-widest uppercase text-[#4A4440]">{label}</span>
      <span className={`rank-${tier} text-xs font-mono px-2 py-1 inline-block`}>{rank}</span>
    </div>
  );
}

const RANK_ACCENT: Record<string, string> = {
  iron: '#7A7870', bronze: '#C47A30', silver: '#9BAFC4', gold: '#E8C200',
  platinum: '#00B8E0', diamond: '#9B71F4', ascendant: '#40D060',
  immortal: '#FF5070', radiant: '#FFD700',
};

export default function ProfileModal({ profile, onClose, onSendRequest, onPass, requestStatus, viewOnly = false }: ProfileModalProps) {
  const displayName = profile.riot_id
    ? `${profile.riot_id}#${profile.riot_tag}`
    : 'UNKNOWN#0000';

  const rankColor = profile.current_rank
    ? (RANK_ACCENT[getRankTier(profile.current_rank)] ?? '#FF4655')
    : '#FF4655';
  const accentColor = profile.profile_accent_color ?? rankColor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/88 backdrop-blur-sm" />
      {/* ProfileBorder must NOT have overflow-hidden — it uses box-shadow for glow animations */}
      <ProfileBorder
        border={profile.profile_border ?? 'none'}
        color={profile.profile_border_color ?? accentColor}
        className="relative w-full max-w-lg"
      >
      <div
        className="bg-[#1B1814] border-2 border-[#2F2B24] overflow-hidden max-h-[92vh] overflow-y-auto"
        style={{ borderTop: `3px solid ${accentColor}`, boxShadow: '8px 8px 0px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex gap-0 relative overflow-hidden">
          <ProfileBanner
            banner={profile.profile_banner ?? 'none'}
            accentColor={accentColor}
          />
          {/* Avatar column */}
          <div className="relative w-28 flex-shrink-0 bg-[#131009]" style={{ minHeight: '7rem' }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-5xl text-[#2F2B24]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {profile.riot_id?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1B1814] to-transparent" />
          </div>

          {/* Info column */}
          <div className="flex-1 p-4 border-l-2 border-[#2F2B24]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <OnlineIndicator isOnline={profile.is_online} showLabel />
                </div>
                <div className="flex items-center gap-2">
                  <h2
                    className="font-black text-xl uppercase truncate leading-tight"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    <UsernameDisplay
                      riotId={profile.riot_id ?? null}
                      riotTag={profile.riot_tag ?? null}
                      effect={profile.username_effect ?? 'none'}
                      accentColor={accentColor}
                      className="text-[#F2EDE4]"
                    />
                  </h2>
                  <BadgesRow
                    isVerified={profile.is_verified}
                    isSupporter={profile.is_supporter}
                    size={15}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {profile.region && (
                    <span className="font-mono text-[9px] border border-[#2F2B24] px-1.5 py-0.5 text-[#4A4440]">{profile.region}</span>
                  )}
                  {profile.gender && (
                    <span className="font-mono text-[9px] border border-[#2F2B24] px-1.5 py-0.5 text-[#4A4440]">{profile.gender}</span>
                  )}
                  {profile.age != null && (
                    <span className="font-mono text-[9px] border border-[#2F2B24] px-1.5 py-0.5 text-[#4A4440]">{profile.age}yo</span>
                  )}
                  {profile.role && (
                    <span className="flex items-center gap-1 text-[#857A6A] font-bold text-[10px] uppercase"
                      style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      <Target size={10} /> {profile.role}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-[#4A4440] hover:text-[#F2EDE4] transition-colors flex-shrink-0 mt-0.5">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Music — compact Spotify embed right below the header */}
        {profile.is_supporter && profile.profile_music_url && (
          <div
            className="border-t-2 border-[#2F2B24]"
            style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, transparent 60%)` }}
          >
            <div className="flex items-center gap-2 px-5 pt-3 pb-1">
              <div className="w-4 h-[2px]" style={{ background: accentColor }} />
              <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: accentColor }}>
                ♫ their vibe
              </span>
            </div>
            <div className="px-4 pb-3">
              <SpotifyPlayer trackUrl={profile.profile_music_url} />
            </div>
          </div>
        )}

        {/* Ranks */}
        <div className="px-5 py-4 border-t-2 border-[#2F2B24]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-[2px]" style={{ background: accentColor }} />
            <span className="font-mono text-[9px] tracking-widest uppercase text-[#4A4440]">COMPETITIVE</span>
          </div>
          <div className="flex items-start gap-5 flex-wrap">
            {profile.peak_rank    && <RankBadge rank={profile.peak_rank}    label="PEAK RANK" />}
            {profile.current_rank && <RankBadge rank={profile.current_rank} label="CURRENT RANK" />}
          </div>
        </div>

        {/* Agents */}
        {profile.agents && profile.agents.length > 0 && (
          <div className="px-5 py-4 border-t-2 border-[#2F2B24]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-[2px] bg-[#FF3C3C]" />
              <span className="font-mono text-[9px] tracking-widest uppercase text-[#4A4440]">AGENTS</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.agents.map(agent => (
                <span key={agent} className="bg-[#131009] border-2 border-[#2F2B24] px-3 py-1 font-mono text-xs text-[#F2EDE4]">
                  {agent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Music */}
        {(profile.music_tags && profile.music_tags.length > 0) || profile.favorite_artist ? (
          <div className="px-5 py-4 border-t-2 border-[#2F2B24]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-[2px] bg-[#8B6FFF]" />
              <span className="font-mono text-[9px] tracking-widest uppercase text-[#4A4440]">MUSIC</span>
              <Music size={9} className="text-[#8B6FFF]" />
            </div>
            {profile.music_tags && profile.music_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.music_tags.map(tag => (
                  <span key={tag} className="bg-[#8B6FFF]/8 border border-[#8B6FFF]/25 px-3 py-1 font-mono text-xs text-[#8B6FFF]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {profile.favorite_artist && (
              <p className="text-sm text-[#8B6FFF]/80">
                <span className="font-mono text-[#4A4440] uppercase text-[8px] tracking-widest mr-2">ARTIST</span>
                {profile.favorite_artist}
              </p>
            )}
          </div>
        ) : null}

        {/* About */}
        {profile.about && (
          <div className="px-5 py-4 border-t-2 border-[#2F2B24]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-[2px] bg-[#FFB800]" />
              <span className="font-mono text-[9px] tracking-widest uppercase text-[#4A4440]">ABOUT</span>
            </div>
            <p className="text-[#857A6A] text-sm leading-relaxed border-l-[3px] border-[#2F2B24] pl-3">
              {profile.about}
            </p>
          </div>
        )}

        {/* Joined */}
        <div className="px-5 py-3 border-t-2 border-[#2F2B24] flex items-center gap-2 text-[#4A4440]">
          <Calendar size={10} />
          <span className="font-mono text-[9px] tracking-widest uppercase">
            JOINED {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </div>

        {/* Actions */}
        <div className="p-4 border-t-2 border-[#2F2B24] flex gap-2 bg-[#131009]">
          {viewOnly ? (
            <div className="flex-1 text-center py-3 text-xs font-mono text-[#4A4440] border-2 border-[#2F2B24] uppercase tracking-widest">
              YOUR PROFILE PREVIEW
            </div>
          ) : requestStatus === 'matched' ? (
            <div className="flex-1 text-center py-3 text-sm font-mono text-[#40D060] border-2 border-[#40D060]/20 bg-[#40D060]/5">
              ✓ MATCHED — GO TO INBOX
            </div>
          ) : requestStatus === 'pending' ? (
            <div className="flex-1 text-center py-3 text-sm font-mono text-[#4A4440] border-2 border-[#2F2B24]">
              REQUEST PENDING
            </div>
          ) : (
            <>
              <button
                onClick={() => { onPass(profile.id); onClose(); }}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-wider border-2 border-[#2F2B24] text-[#4A4440] hover:border-[#3A3530] hover:text-[#857A6A] transition-all"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                PASS
              </button>
              <button
                onClick={() => { onSendRequest(profile.id); }}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '4px 4px 0px rgba(255,70,85,0.2)' }}
              >
                SEND REQUEST
              </button>
            </>
          )}
        </div>
      </div>
      </ProfileBorder>
    </div>
  );
}
