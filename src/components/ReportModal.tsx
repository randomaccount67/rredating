'use client';
import { useState } from 'react';
import { X, Flag } from 'lucide-react';

const REASONS = [
  'Harassment',
  'Inappropriate content',
  'Fake profile',
  'Spam',
  'Other',
];

interface ReportModalProps {
  reportedProfileId: string;
  reportedName: string;
  onClose: () => void;
}

export default function ReportModal({ reportedProfileId, reportedName, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reported_profile_id: reportedProfileId, reason, details }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to submit');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-[#1A1D24] border border-[#2A2D35] w-full max-w-sm"
        style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2D35]">
          <div className="flex items-center gap-2">
            <Flag size={13} className="text-[#FF4655]" />
            <span className="font-mono text-xs text-[#E8EAF0] uppercase tracking-wider">Report Player</span>
          </div>
          <button onClick={onClose} className="text-[#525566] hover:text-[#E8EAF0] transition-colors">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <p className="font-mono text-xs text-[#FF4655] mb-1">// REPORT SUBMITTED</p>
            <p className="text-[#8B8FA8] text-sm">We'll review this report shortly.</p>
            <button onClick={onClose} className="mt-5 btn-ghost text-xs">CLOSE</button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <p className="font-mono text-[10px] text-[#525566] uppercase">
              Reporting: <span className="text-[#8B8FA8]">{reportedName}</span>
            </p>

            {/* Reason dropdown */}
            <div>
              <label className="label block mb-2">REASON</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-xs font-mono text-[#E8EAF0] focus:border-[#FF4655] outline-none"
              >
                <option value="">Select a reason...</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Details */}
            <div>
              <label className="label block mb-2">DETAILS (optional)</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder="Additional context..."
                className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-xs font-mono text-[#8B8FA8] focus:border-[#FF4655] outline-none resize-none placeholder-[#525566]"
              />
            </div>

            {error && <p className="font-mono text-[10px] text-[#FF4655]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 btn-ghost text-xs">CANCEL</button>
              <button
                onClick={handleSubmit}
                disabled={!reason || loading}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors disabled:opacity-40"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
              >
                {loading ? 'SUBMITTING...' : 'SUBMIT REPORT'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
