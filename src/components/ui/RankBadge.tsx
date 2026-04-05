'use client';
import { getRankTier } from '@/types';

interface RankBadgeProps {
  rank: string;
  label?: string;
  size?: 'sm' | 'md';
}

export default function RankBadge({ rank, label, size = 'md' }: RankBadgeProps) {
  const tier = getRankTier(rank);
  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1';

  return (
    <div className="flex flex-col items-start gap-0.5">
      {label && <span className="label">{label}</span>}
      <span className={`rank-${tier} font-mono font-bold uppercase tracking-wider ${sizeClasses} inline-block`}
        style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        {rank}
      </span>
    </div>
  );
}
