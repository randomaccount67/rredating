export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Target, Music, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Profile, getRankTier } from '@/types';

function RankBadge({ rank, label }: { rank: string; label: string }) {
  const tier = getRankTier(rank);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-[#525566] font-mono text-[8px] tracking-widest uppercase">{label}</span>
      <span className={`rank-${tier} text-xs font-mono px-2 py-1 inline-block`}>{rank}</span>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !profile) notFound();

  const p = profile as Profile;
  const displayName = p.riot_id ? `${p.riot_id}#${p.riot_tag}` : 'UNKNOWN#0000';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-[#1A1D24] border border-[#2A2D35] overflow-hidden"
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>

        {/* Header */}
        <div className="p-8 border-b border-[#2A2D35]">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
              {p.avatar_url ? (
                <Image src={p.avatar_url} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-4xl text-[#525566]">
                  {p.riot_id?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-mono text-xl text-[#E8EAF0]">{displayName}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {p.region && <span className="text-[#525566] font-mono text-[10px] border border-[#2A2D35] px-2 py-0.5">{p.region}</span>}
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
        <div className="px-6 py-4 flex items-center gap-2 text-[#525566]">
          <Calendar size={11} />
          <span className="font-mono text-[10px]">
            JOINED {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
