'use client';
import Image from 'next/image';
import { X, Target, Music, Calendar } from 'lucide-react';
import { Profile, getRankTier } from '@/types';
import OnlineIndicator from '@/components/ui/OnlineIndicator';

interface ProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onSendRequest: (id: string) => void;
  onPass: (id: string) => void;
  requestStatus?: 'pending' | 'matched' | 'declined' | null;
}

function RankBadge({ rank, label }: { rank: string; label: string }) {
  const tier = getRankTier(rank);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-[#525566] font-mono text-[8px] tracking-widest uppercase">{label}</span>
      <span className={`rank-${tier} text-xs font-mono px-2 py-1 inline-block`}>{rank}</span>
    </div>
  );
}

export default function ProfileModal({ profile, onClose, onSendRequest, onPass, requestStatus }: ProfileModalProps) {
  const displayName = profile.riot_id
    ? `${profile.riot_id}#${profile.riot_tag}`
    : 'UNKNOWN#0000';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#1A1D24] border border-[#2A2D35] overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-[#2A2D35]">
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 text-[#525566] hover:text-[#E8EAF0] transition-colors">
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-mono text-3xl text-[#525566]">{profile.riot_id?.[0]?.toUpperCase() ?? '?'}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <OnlineIndicator isOnline={profile.is_online} showLabel />
              </div>
              <h2 className="font-mono text-lg text-[#E8EAF0] truncate">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                {profile.region && (
                  <span className="text-[#525566] font-mono text-[10px] border border-[#2A2D35] px-2 py-0.5">{profile.region}</span>
                )}
                {profile.role && (
                  <span className="flex items-center gap-1 text-[#8B8FA8] font-bold text-xs uppercase"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    <Target size={10} /> {profile.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ranks */}
        <div className="p-6 border-b border-[#2A2D35]">
          <span className="label mb-3 block">// COMPETITIVE</span>
          <div className="flex items-start gap-6 flex-wrap">
            {profile.peak_rank && <RankBadge rank={profile.peak_rank} label="PEAK RANK" />}
            {profile.current_rank && <RankBadge rank={profile.current_rank} label="CURRENT RANK" />}
            </div>
        </div>

        {/* Agents */}
        {profile.agents && profile.agents.length > 0 && (
          <div className="p-6 border-b border-[#2A2D35]">
            <span className="label mb-3 block">// AGENTS</span>
            <div className="flex flex-wrap gap-2">
              {profile.agents.map(agent => (
                <span key={agent} className="bg-[#13151A] border border-[#2A2D35] px-3 py-1 font-mono text-xs text-[#E8EAF0]">
                  {agent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Music */}
        {profile.music_tags && profile.music_tags.length > 0 && (
          <div className="p-6 border-b border-[#2A2D35]">
            <span className="label mb-3 block flex items-center gap-1"><Music size={10} className="inline" /> MUSIC</span>
            <div className="flex flex-wrap gap-2">
              {profile.music_tags.map(tag => (
                <span key={tag} className="bg-[#13151A] border border-[#2A2D35] px-3 py-1 font-mono text-xs text-[#8B8FA8]">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        {profile.about && (
          <div className="p-6 border-b border-[#2A2D35]">
            <span className="label mb-3 block">// ABOUT</span>
            <p className="text-[#8B8FA8] text-sm leading-relaxed">{profile.about}</p>
          </div>
        )}

        {/* Joined */}
        <div className="px-6 py-3 border-b border-[#2A2D35] flex items-center gap-2 text-[#525566]">
          <Calendar size={11} />
          <span className="font-mono text-[10px]">
            JOINED {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-2">
          {requestStatus === 'matched' ? (
            <div className="flex-1 text-center py-3 text-sm font-mono text-green-400 border border-green-400/20 bg-green-400/5">
              ✓ MATCHED — GO TO INBOX
            </div>
          ) : requestStatus === 'pending' ? (
            <div className="flex-1 text-center py-3 text-sm font-mono text-[#525566] border border-[#2A2D35]">
              REQUEST PENDING
            </div>
          ) : (
            <>
              <button
                onClick={() => { onPass(profile.id); onClose(); }}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-wider border border-[#2A2D35] text-[#525566] hover:border-[#525566] hover:text-[#8B8FA8] transition-all"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                PASS
              </button>
              <button
                onClick={() => { onSendRequest(profile.id); }}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                SEND REQUEST
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
