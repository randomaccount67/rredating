'use client';
import { useState } from 'react';

interface Props {
  rating?: string | null;
  isMe: boolean;
}

const RATING_META: Record<string, { bg: string; symbol: string; label: string; reason: string }> = {
  brilliant:  { bg: '#1BADA6', symbol: '!!', label: 'Brilliant',   reason: 'holy shit what a shot' },
  great:      { bg: '#5C8BB0', symbol: '!',  label: 'Great',       reason: 'green as fuck' },
  best:       { bg: '#96BC4B', symbol: '✓',  label: 'Best',        reason: 'W shot, not much you could have done better here' },
  good:       { bg: '#95AF57', symbol: '·',  label: 'Good',        reason: 'not bad kid' },
  book:       { bg: '#A88B65', symbol: '=',  label: 'Book',        reason: 'standard, not much to say here' },
  inaccuracy: { bg: '#F7C631', symbol: '?!', label: 'Inaccuracy',  reason: 'could be better but like you didn\'t sell anything' },
  mistake:    { bg: '#E58F2A', symbol: '?',  label: 'Mistake',     reason: 'yeah that just wasn\'t the shot' },
  blunder:    { bg: '#CA3431', symbol: '??', label: 'Blunder',     reason: 'what the actual fuck are you doing?' },
  miss:       { bg: '#DB73A0', symbol: '✕',  label: 'Miss',        reason: 'they gave you a layup and you just completely missed it or you hate them' },
};

export default function ChatAnalysisIcon({ rating, isMe }: Props) {
  const [show, setShow] = useState(false);

  if (!rating) return null;
  const meta = RATING_META[rating];
  if (!meta) return null;

  return (
    <div className="relative flex-shrink-0 self-center" style={{ marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0 }}>
      <button
        type="button"
        aria-label={`${meta.label}: ${meta.reason}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={() => setShow(prev => !prev)}
        className="flex items-center justify-center rounded-full text-white font-extrabold select-none"
        style={{
          width: 24,
          height: 24,
          background: meta.bg,
          fontSize: meta.symbol.length > 1 ? 8 : 11,
          lineHeight: 1,
        }}
      >
        {meta.symbol}
      </button>

      {show && (
        <div
          className="absolute z-50 bottom-full mb-2 w-48 rounded p-2.5 text-left pointer-events-none"
          style={{
            background: '#1A1D24',
            border: '1px solid #2A2D35',
            left: isMe ? 0 : undefined,
            right: isMe ? undefined : 0,
          }}
        >
          <p className="font-bold text-[12px] mb-1" style={{ color: meta.bg, fontFamily: 'Barlow Condensed, sans-serif' }}>
            {meta.label.toUpperCase()} {meta.symbol}
          </p>
          <p className="text-[#8B90A8] text-[11px] leading-snug font-mono">{meta.reason}</p>
        </div>
      )}
    </div>
  );
}
