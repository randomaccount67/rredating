'use client';
import { useState, useRef, useCallback } from 'react';

interface Props {
  rating?: string | null;
  isMe: boolean;
}

interface TooltipPos {
  bottom: number;
  left?: number;
  right?: number;
}

const RATING_META: Record<string, { bg: string; symbol: string; label: string; reason: string }> = {
  brilliant:  { bg: '#1BADA6', symbol: '!!', label: 'Brilliant',   reason: 'holy shit what a shot' },
  great:      { bg: '#5C8BB0', symbol: '!',  label: 'Great',       reason: 'green as fuck' },
  best:       { bg: '#96BC4B', symbol: '✓',  label: 'Best',        reason: 'W shot, not much you could have done better here' },
  good:       { bg: '#95AF57', symbol: '·',  label: 'Good',        reason: 'not bad kid' },
  book:       { bg: '#A88B65', symbol: '=',  label: 'Book',        reason: 'standard, not much to say here' },
  inaccuracy: { bg: '#F7C631', symbol: '?!', label: 'Inaccuracy',  reason: "could be better but like you didn't sell anything" },
  mistake:    { bg: '#E58F2A', symbol: '?',  label: 'Mistake',     reason: "yeah that just wasn't the shot" },
  blunder:    { bg: '#CA3431', symbol: '??', label: 'Blunder',     reason: 'what the actual fuck are you doing?' },
  miss:       { bg: '#DB73A0', symbol: '✕',  label: 'Miss',        reason: 'they gave you a layup and you just completely missed it or you hate them' },
};

export default function ChatAnalysisIcon({ rating, isMe }: Props) {
  const [tooltip, setTooltip] = useState<TooltipPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openTooltip = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // Place tooltip bottom 8px above the button's top edge
    const bottom = window.innerHeight - rect.top + 8;
    // Open to the right if there's room (220px), otherwise to the left
    const spaceRight = window.innerWidth - rect.left;
    const pos: TooltipPos = { bottom };
    if (spaceRight >= 220) {
      pos.left = rect.left;
    } else {
      pos.right = window.innerWidth - rect.right;
    }
    setTooltip(pos);
  }, []);

  const closeTooltip = useCallback(() => setTooltip(null), []);

  if (!rating) return null;
  const meta = RATING_META[rating];
  if (!meta) return null;

  return (
    <div
      className="flex-shrink-0 self-end"
      style={{ marginLeft: isMe ? 6 : 0, marginRight: isMe ? 0 : 6, marginBottom: 2 }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={`${meta.label}: ${meta.reason}`}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onTouchStart={e => { e.stopPropagation(); tooltip ? closeTooltip() : openTooltip(); }}
        onTouchEnd={e => e.stopPropagation()}
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

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            bottom: tooltip.bottom,
            left: tooltip.left,
            right: tooltip.right,
            zIndex: 9999,
            background: '#1A1D24',
            border: '1px solid #2A2D35',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 200,
            maxWidth: 280,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            pointerEvents: 'none',
          }}
        >
          <p
            className="font-bold mb-1"
            style={{ color: meta.bg, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13 }}
          >
            {meta.label.toUpperCase()} {meta.symbol}
          </p>
          <p style={{ color: '#8B90A8', fontSize: 13, lineHeight: 1.4, fontFamily: 'monospace' }}>
            {meta.reason}
          </p>
        </div>
      )}
    </div>
  );
}
