'use client';

interface ProfileBorderProps {
  border: string;
  color: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wraps children with an animated supporter border.
 * The border animation is rendered in an absolutely-positioned overlay div so
 * that opacity, clip-path, and transform animations are scoped to the border
 * layer only and do NOT inherit into child elements.
 */
export default function ProfileBorder({ border, color, children, className = '', style = {} }: ProfileBorderProps) {
  if (!border || border === 'none') {
    return <div className={className} style={style}>{children}</div>;
  }

  const borderClass = {
    solid: 'border-2 border-solid',
    glitch: 'border-glitch',
    fire: 'border-fire',
    neon_pulse: 'border-neon-pulse',
    rainbow: 'border-rainbow',
    static: 'border-static',
  }[border] ?? '';

  const overlayStyle: React.CSSProperties = {
    borderColor: color,
    '--neon-color': color,
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  } as React.CSSProperties;

  return (
    <div className={`${className} relative`} style={style}>
      {/* Border animation layer — isolated from children so opacity/clip-path/transform don't bleed */}
      <div aria-hidden="true" className={borderClass} style={overlayStyle} />
      {children}
    </div>
  );
}
