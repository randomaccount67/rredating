'use client';

interface OnlineIndicatorProps {
  isOnline: boolean;
  showLabel?: boolean;
}

export default function OnlineIndicator({ isOnline, showLabel = false }: OnlineIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-[#525566]'}`} />
      {showLabel && (
        <span className="label">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      )}
    </div>
  );
}
