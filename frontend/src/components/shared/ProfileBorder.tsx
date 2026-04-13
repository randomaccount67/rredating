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
 * Pass border='none' or a falsy border and the wrapper is transparent.
 */
export default function ProfileBorder({ border, color, children, className = '', style = {} }: ProfileBorderProps) {
  if (!border || border === 'none') {
    return <div className={className} style={style}>{children}</div>;
  }

  const baseStyle: React.CSSProperties = {
    borderColor: color,
    '--neon-color': color,
    ...style,
  } as React.CSSProperties;

  const borderClass = {
    solid: 'border-2 border-solid',
    glitch: 'border-glitch',
    fire: 'border-fire',
    neon_pulse: 'border-neon-pulse',
    rainbow: 'border-rainbow',
    static: 'border-static',
  }[border] ?? '';

  return (
    <div
      className={`${className} ${borderClass}`}
      style={baseStyle}
    >
      {children}
    </div>
  );
}
