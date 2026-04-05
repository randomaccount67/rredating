'use client';
import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from './ReportModal';

interface ReportButtonProps {
  profileId: string;
  displayName: string;
}

export default function ReportButton({ profileId, displayName }: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[#525566] hover:text-[#FF4655] font-mono text-[10px] uppercase tracking-wider transition-colors"
        title="Report this profile"
      >
        <Flag size={11} /> Report
      </button>
      {open && (
        <ReportModal
          reportedProfileId={profileId}
          reportedName={displayName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
