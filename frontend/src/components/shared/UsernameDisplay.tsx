'use client';

interface UsernameDisplayProps {
  riotId: string | null;
  riotTag: string | null;
  effect: string;
  accentColor?: string;
  className?: string;
}

/**
 * Renders a Riot ID#Tag with the profile's username_effect applied.
 * Falls back gracefully when no effect or 'none'.
 */
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
  const style: React.CSSProperties = effect === 'neon' ? { color: accentColor } : {};

  return (
    <span className={`${className} ${cls}`} style={style}>
      {name}
      <span className="opacity-50 text-[0.8em]">{tag}</span>
    </span>
  );
}
