interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export default function VerifiedBadge({ size = 16, className = '' }: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      aria-label="Verified"
      role="img"
    >
      {/* Solid blue circle */}
      <circle cx="8" cy="8" r="8" fill="#1D9BF0" />
      {/* White checkmark */}
      <path
        d="M4.5 8.2L6.8 10.5L11.5 5.5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
