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

const RATING_META: Record<string, { label: string; reason: string }> = {
  brilliant:  { label: 'Brilliant',   reason: 'holy shit what a shot' },
  great:      { label: 'Great',       reason: 'green as fuck' },
  best:       { label: 'Best',        reason: 'W shot, not much you could have done better here' },
  good:       { label: 'Good',        reason: 'not bad kid' },
  book:       { label: 'Book',        reason: 'standard, not much to say here' },
  inaccuracy: { label: 'Inaccuracy',  reason: "could be better but like you didn't sell anything" },
  mistake:    { label: 'Mistake',     reason: "yeah that just wasn't the shot" },
  blunder:    { label: 'Blunder',     reason: 'what the actual fuck are you doing?' },
  miss:       { label: 'Miss',        reason: 'they gave you a layup and you just completely missed it or you hate them' },
};

export default function ChatAnalysisIcon({ rating, isMe }: Props) {
  const [tooltip, setTooltip] = useState<TooltipPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openTooltip = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const bottom = window.innerHeight - rect.top + 8;
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
        className="flex items-center justify-center select-none bg-transparent border-0 p-0 cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/${rating}.png`}
          alt={rating}
          width={32}
          height={32}
          draggable={false}
        />
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
            style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#E8EAF0' }}
          >
            {meta.label.toUpperCase()}
          </p>
          <p style={{ color: '#8B90A8', fontSize: 13, lineHeight: 1.4, fontFamily: 'monospace' }}>
            {meta.reason}
          </p>
        </div>
      )}
    </div>
  );
}
