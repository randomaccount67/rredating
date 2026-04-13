import { Crown } from 'lucide-react';

interface SupporterBadgeProps {
  size?: number;
}

export default function SupporterBadge({ size = 16 }: SupporterBadgeProps) {
  return (
    <span title="Supporter" className="inline-flex items-center justify-center" style={{ color: '#FFE84D', filter: 'drop-shadow(0 0 4px #FFE84D88)' }}>
      <Crown size={size} strokeWidth={2} fill="#FFE84D" />
    </span>
  );
}
