import VerifiedBadge from './VerifiedBadge';
import SupporterBadge from './SupporterBadge';

interface BadgesRowProps {
  isVerified?: boolean;
  isSupporter?: boolean;
  size?: number;
  className?: string;
}

export default function BadgesRow({ isVerified, isSupporter, size = 16, className = '' }: BadgesRowProps) {
  if (!isVerified && !isSupporter) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {isVerified && <VerifiedBadge size={size} />}
      {isSupporter && <SupporterBadge size={size} />}
    </span>
  );
}
