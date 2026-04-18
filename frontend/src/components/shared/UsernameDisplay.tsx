'use client';

interface UsernameDisplayProps {
  riotId: string | null;
  riotTag: string | null;
  effect: string;
  accentColor?: string;
  className?: string;
}

export default function UsernameDisplay({ riotId, riotTag, effect, accentColor = '#FF4655', className = '' }: UsernameDisplayProps) {
  const name = riotId ?? 'UNKNOWN';
  const tag = riotTag ? `#${riotTag}` : '';

  if (!effect || effect === 'none') {
    return (
      <span className={className}>
        {name}
        <span className="opacity-50 text-[0.8em]">{tag}</span>
      </span>
    );
  }

  const effectClass: Record<string, string> = {
    gradient: 'username-gradient',
    glitch: 'username-glitch',
    shimmer: 'username-shimmer',
    neon: 'username-neon',
  };

  const cls = effectClass[effect] ?? '';
  const outerStyle: React.CSSProperties = effect === 'neon' ? { color: accentColor } : {};

  // gradient/shimmer use background-clip:text + -webkit-text-fill-color:transparent.
  // Child spans inherit the transparent fill but NOT the background, making them invisible.
  // Override -webkit-text-fill-color on the tag span with an explicit muted color.
  const usesBackgroundClip = effect === 'gradient' || effect === 'shimmer';
  const tagStyle: React.CSSProperties = usesBackgroundClip
    ? { WebkitTextFillColor: 'rgba(236,240,248,0.4)', fontSize: '0.8em' }
    : { fontSize: '0.8em' };

  return (
    <span className={`${className} ${cls}`} style={outerStyle}>
      {name}
      <span className={usesBackgroundClip ? '' : 'opacity-50'} style={tagStyle}>{tag}</span>
    </span>
  );
}
