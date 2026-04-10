'use client';
import Image from 'next/image';
import { Target, Music } from 'lucide-react';
import { Profile, getRankTier } from '@/types';
import OnlineIndicator from '@/components/ui/OnlineIndicator';

interface ProfileCardProps {
  profile: Profile;
  onSendRequest: (id: string) => void;
  onPass: (id: string) => void;
  onViewProfile: (profile: Profile) => void;
  requestStatus?: 'pending' | 'matched' | 'declined' | null;
}

function RankPill({ rank }: { rank: string }) {
  const tier = getRankTier(rank);
  return (
    <span className={`rank-${tier} text-[9px] font-mono px-1.5 py-0.5 inline-block`}>
      {rank}
    </span>
  );
}

const RANK_ACCENT: Record<string, string> = {
  iron: '#7A7870', bronze: '#C47A30', silver: '#9BAFC4', gold: '#E8C200',
  platinum: '#00B8E0', diamond: '#9B71F4', ascendant: '#40D060',
  immortal: '#FF5070', radiant: '#FFD700',
};

export default function ProfileCard({ profile, onSendRequest, onPass, onViewProfile, requestStatus }: ProfileCardProps) {
  const displayName = profile.riot_id
    ? `${profile.riot_id}#${profile.riot_tag}`
    : 'UNKNOWN#0000';

  const rankColor = profile.current_rank
    ? (RANK_ACCENT[getRankTier(profile.current_rank)] ?? '#FF4655')
    : '#2F2B24';

  return (
    <div
      className="bg-[#1B1814] border-2 border-[#2F2B24] hover:border-[#3A3530] transition-all duration-200 animate-fade-in flex flex-col"
      style={{ borderTop: `3px solid ${rankColor}`, boxShadow: '0 0 0 0 transparent' }}
    >
      {/* Avatar + header */}
      <div
        className="relative cursor-pointer overflow-hidden"
        style={{ aspectRatio: '4/3', background: '#131009' }}
        onClick={() => onViewProfile(profile)}
      >
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={displayName}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="font-black text-7xl text-[#2F2B24]"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {profile.riot_id?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1B1814] to-transparent" />

        {/* Online indicator */}
        <div className="absolute top-2 right-2">
          <OnlineIndicator isOnline={profile.is_online} />
        </div>

        {/* Region badge */}
        {profile.region && (
          <div className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 bg-[#0D0B08]/80 border border-[#2F2B24] text-[#857A6A]">
            {profile.region}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2 cursor-pointer" onClick={() => onViewProfile(profile)}>
        {/* Name */}
        <div>
          <h3 className="font-mono text-sm text-[#F2EDE4] truncate">{displayName}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {profile.role && (
              <span className="flex items-center gap-1 text-[#857A6A] text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                <Target size={10} /> {profile.role}
              </span>
            )}
            {profile.peak_rank && (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[8px] text-[#4A4440] uppercase">PEAK</span>
                <RankPill rank={profile.peak_rank} />
              </div>
            )}
            {profile.current_rank && (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[8px] text-[#4A4440] uppercase">NOW</span>
                <RankPill rank={profile.current_rank} />
              </div>
            )}
          </div>
        </div>

        {/* Agents */}
        {profile.agents && profile.agents.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {profile.agents.map(agent => (
              <span key={agent} className="bg-[#00D4FF]/5 border border-[#00D4FF]/20 px-2 py-0.5 font-mono text-[9px] text-[#00D4FF]">
                {agent}
              </span>
            ))}
          </div>
        )}

        {/* Music */}
        {profile.music_tags && profile.music_tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Music size={9} className="text-[#8B6FFF] flex-shrink-0" />
            {profile.music_tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] font-mono text-[#8B6FFF]">{tag}</span>
            ))}
          </div>
        )}

        {/* About */}
        {profile.about && (
          <p className="text-[#857A6A] text-xs leading-relaxed line-clamp-2 border-l-2 border-[#2F2B24] pl-2">
            {profile.about}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 pt-0 flex gap-2 border-t border-[#2F2B24] mt-auto">
        {requestStatus === 'matched' ? (
          <div className="flex-1 text-center py-2 text-xs font-mono text-[#40D060] border-2 border-[#40D060]/20 bg-[#40D060]/5">
            ✓ MATCHED
          </div>
        ) : requestStatus === 'pending' ? (
          <div className="flex-1 text-center py-2 text-xs font-mono text-[#4A4440] border-2 border-[#2F2B24]">
            REQUEST SENT
          </div>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPass(profile.id); }}
              className="flex-1 py-2 text-xs font-bold uppercase tracking-wider border-2 border-[#2F2B24] text-[#4A4440] hover:border-[#3A3530] hover:text-[#857A6A] transition-all"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              PASS
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSendRequest(profile.id); }}
              className="flex-1 py-2 text-xs font-bold uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '3px 3px 0px rgba(255,70,85,0.2)' }}
            >
              SEND REQUEST
            </button>
          </>
        )}
      </div>
    </div>
  );
}
