'use client';
import { useState } from 'react';

interface Props {
  rating?: string | null;
  reason?: string | null;
}

const RATING_META: Record<string, { bg: string; symbol: string; label: string }> = {
  brilliant:  { bg: '#1BADA6', symbol: '!!', label: 'Brilliant' },
  great:      { bg: '#5C8BB0', symbol: '!',  label: 'Great' },
  best:       { bg: '#96BC4B', symbol: '✓',  label: 'Best' },
  good:       { bg: '#95AF57', symbol: '·',  label: 'Good' },
  book:       { bg: '#A88B65', symbol: '=',  label: 'Book' },
  inaccuracy: { bg: '#F7C631', symbol: '?!', label: 'Inaccuracy' },
  mistake:    { bg: '#E58F2A', symbol: '?',  label: 'Mistake' },
  blunder:    { bg: '#CA3431', symbol: '??', label: 'Blunder' },
  miss:       { bg: '#DB73A0', symbol: '✕',  label: 'Miss' },
};

export default function ChatAnalysisIcon({ rating, reason }: Props) {
  const [show, setShow] = useState(false);

  if (!rating || !reason) return null;
  const meta = RATING_META[rating];
  if (!meta) return null;

  return (
    <div className="relative flex-shrink-0 self-end mb-1">
      <button
        type="button"
        aria-label={`${meta.label}: ${reason}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={() => setShow(prev => !prev)}
        className="flex items-center justify-center rounded-full text-white font-bold select-none"
        style={{
          width: 20,
          height: 20,
          background: meta.bg,
          fontSize: meta.symbol.length > 1 ? 7 : 9,
          lineHeight: 1,
        }}
      >
        {meta.symbol}
      </button>

      {show && (
        <div
          className="absolute z-50 bottom-full mb-1.5 right-0 w-44 rounded p-2 text-left pointer-events-none"
          style={{ background: '#1A1D24', border: '1px solid #2A2D35' }}
        >
          <p className="font-bold text-[11px] mb-0.5" style={{ color: meta.bg, fontFamily: 'Barlow Condensed, sans-serif' }}>
            {meta.label.toUpperCase()} {meta.symbol}
          </p>
          <p className="text-[#8B90A8] text-[11px] leading-snug font-mono">{reason}</p>
        </div>
      )}
    </div>
  );
}
