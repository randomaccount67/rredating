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

export default function ProfileCard({ profile, onSendRequest, onPass, onViewProfile, requestStatus }: ProfileCardProps) {
  const displayName = profile.riot_id
    ? `${profile.riot_id}#${profile.riot_tag}`
    : 'UNKNOWN#0000';

  return (
    <div
      className="bg-[#1A1D24] border border-[#2A2D35] hover:border-[#FF4655]/50 transition-all duration-200 group cursor-pointer animate-fade-in"
      style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
    >
      {/* Card header */}
      <div className="p-4 border-b border-[#2A2D35]" onClick={() => onViewProfile(profile)}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 bg-[#13151A] border border-[#2A2D35] overflow-hidden"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-mono text-xl text-[#525566]">
                    {profile.riot_id?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineIndicator isOnline={profile.is_online} />
            </div>
          </div>

          {/* Name + region */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-mono text-sm text-[#E8EAF0] truncate">{displayName}</h3>
              <span className="text-[#525566] font-mono text-[9px] border border-[#2A2D35] px-1.5 py-0.5 flex-shrink-0">
                {profile.region ?? '??'}
              </span>
            </div>

            {/* Ranks */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {profile.peak_rank && (
                <div className="flex items-center gap-1">
                  <span className="label text-[8px]">PEAK</span>
                  <RankPill rank={profile.peak_rank} />
                </div>
              )}
              {profile.current_rank && (
                <div className="flex items-center gap-1">
                  <span className="label text-[8px]">NOW</span>
                  <RankPill rank={profile.current_rank} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 py-2.5 border-b border-[#2A2D35] flex items-center gap-3 text-[#8B8FA8]" onClick={() => onViewProfile(profile)}>
        {profile.role && (
          <div className="flex items-center gap-1">
            <Target size={11} />
            <span className="font-bold text-[11px] uppercase tracking-wide text-[#E8EAF0]"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{profile.role}</span>
          </div>
        )}
      </div>

      {/* Agents */}
      {profile.agents && profile.agents.length > 0 && (
        <div className="px-4 py-2 border-b border-[#2A2D35] flex items-center gap-1.5 flex-wrap" onClick={() => onViewProfile(profile)}>
          {profile.agents.map(agent => (
            <span key={agent} className="bg-[#13151A] border border-[#2A2D35] px-2 py-0.5 font-mono text-[10px] text-[#8B8FA8]">
              {agent}
            </span>
          ))}
        </div>
      )}

      {/* Music tags */}
      {profile.music_tags && profile.music_tags.length > 0 && (
        <div className="px-4 py-2 border-b border-[#2A2D35] flex items-center gap-1.5 flex-wrap" onClick={() => onViewProfile(profile)}>
          <Music size={10} className="text-[#525566] flex-shrink-0" />
          {profile.music_tags.map(tag => (
            <span key={tag} className="text-[9px] font-mono text-[#525566]">{tag}</span>
          ))}
        </div>
      )}

      {/* About snippet */}
      {profile.about && (
        <div className="px-4 py-2.5 border-b border-[#2A2D35]" onClick={() => onViewProfile(profile)}>
          <p className="text-[#8B8FA8] text-xs leading-relaxed line-clamp-2">{profile.about}</p>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 flex gap-2">
        {requestStatus === 'matched' ? (
          <div className="flex-1 text-center py-2 text-xs font-mono text-green-400 border border-green-400/20 bg-green-400/5">
            ✓ MATCHED
          </div>
        ) : requestStatus === 'pending' ? (
          <div className="flex-1 text-center py-2 text-xs font-mono text-[#525566] border border-[#2A2D35]">
            REQUEST SENT
          </div>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPass(profile.id); }}
              className="flex-1 py-2 text-xs font-bold uppercase tracking-wider border border-[#2A2D35] text-[#525566] hover:border-[#525566] hover:text-[#8B8FA8] transition-all"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              PASS
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSendRequest(profile.id); }}
              className="flex-1 py-2 text-xs font-bold uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
            >
              SEND REQUEST
            </button>
          </>
        )}
      </div>
    </div>
  );
}
