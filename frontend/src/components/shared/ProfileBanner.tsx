'use client';

interface ProfileBannerProps {
  banner: string;
  accentColor?: string;
  className?: string;
}

/**
 * Decorative banner background for full profile views.
 * Renders an animated SVG/CSS background behind the profile header.
 */
export default function ProfileBanner({ banner, accentColor = '#FF4655', className = '' }: ProfileBannerProps) {
  if (!banner || banner === 'none') return null;

  const color = accentColor;
  const colorAlpha = `${color}44`;

  const banners: Record<string, React.ReactNode> = {
    geometric: (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.25 }}>
        <defs>
          <pattern id="geo" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <polygon points="20,2 38,38 2,38" fill="none" stroke={color} strokeWidth="0.5" />
            <rect x="10" y="10" width="20" height="20" fill="none" stroke={colorAlpha} strokeWidth="0.3" transform="rotate(45 20 20)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#geo)" />
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="40s" repeatCount="indefinite" />
      </svg>
    ),
    grid: (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }}>
        <defs>
          <pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke={color} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      </svg>
    ),
    stars: (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={i}
            cx={`${(i * 37 + 11) % 100}%`}
            cy={`${(i * 53 + 7) % 100}%`}
            r={i % 3 === 0 ? '1.5' : '0.8'}
            fill={color}
            opacity={0.4 + (i % 5) * 0.12}
          >
            <animate attributeName="opacity" values={`${0.2 + (i % 3) * 0.2};0.8;${0.2 + (i % 3) * 0.2}`} dur={`${2 + (i % 4)}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    ),
    waves: (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }} preserveAspectRatio="none">
        <path d="M0,30 Q25,10 50,30 T100,30 T150,30 T200,30 V100 H0 Z" fill={color}>
          <animateTransform attributeName="transform" type="translate" from="0,0" to="-50,0" dur="4s" repeatCount="indefinite" />
        </path>
        <path d="M0,50 Q25,30 50,50 T100,50 T150,50 T200,50 V100 H0 Z" fill={colorAlpha}>
          <animateTransform attributeName="transform" type="translate" from="-50,0" to="0,0" dur="5s" repeatCount="indefinite" />
        </path>
      </svg>
    ),
    particles: (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 20 }).map((_, i) => (
          <rect
            key={i}
            x={`${(i * 47 + 5) % 100}%`}
            y={`${(i * 31 + 15) % 100}%`}
            width="3"
            height="3"
            fill={color}
            opacity="0.5"
            transform={`rotate(45)`}
          >
            <animate attributeName="y" values={`${(i * 31 + 15) % 100}%;${(i * 31 + 5) % 100}%;${(i * 31 + 15) % 100}%`} dur={`${3 + (i % 3)}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${2 + (i % 4)}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </svg>
    ),
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {banners[banner] ?? null}
      {/* Gradient overlay so text stays readable */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(11,13,17,0.85) 100%)' }} />
    </div>
  );
}
