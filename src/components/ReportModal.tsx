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
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <div
        className="relative bg-[#1B1814] border-2 border-[#2F2B24] w-full max-w-sm"
        style={{ borderTop: '3px solid #FF3C3C', boxShadow: '6px 6px 0px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#2F2B24]">
          <div className="flex items-center gap-2">
            <Flag size={13} className="text-[#FF3C3C]" />
            <span className="font-mono text-xs text-[#F2EDE4] uppercase tracking-wider">Report Player</span>
          </div>
          <button onClick={onClose} className="text-[#4A4440] hover:text-[#F2EDE4] transition-colors">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="w-8 h-[2px] bg-[#FF4655] mx-auto mb-3" />
            <p className="font-mono text-xs text-[#FF4655] mb-1 uppercase tracking-widest">REPORT SUBMITTED</p>
            <p className="text-[#857A6A] text-sm mt-2">We&apos;ll review this report shortly.</p>
            <button onClick={onClose} className="mt-5 btn-ghost text-xs">CLOSE</button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <p className="font-mono text-[10px] text-[#4A4440] uppercase">
              Reporting: <span className="text-[#857A6A]">{reportedName}</span>
            </p>

            {/* Reason */}
            <div>
              <label className="label block mb-2">REASON</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-[#131009] border-2 border-[#2F2B24] px-3 py-2 text-sm text-[#F2EDE4] focus:border-[#FF4655] outline-none transition-colors"
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
                className="w-full bg-[#131009] border-2 border-[#2F2B24] px-3 py-2 text-sm text-[#857A6A] focus:border-[#FF4655] outline-none resize-none transition-colors"
              />
            </div>

            {error && <p className="font-mono text-[10px] text-[#FF3C3C]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 btn-ghost text-xs">CANCEL</button>
              <button
                onClick={handleSubmit}
                disabled={!reason || loading}
                className="flex-1 py-2 text-xs font-black uppercase tracking-wider bg-[#FF3C3C] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '3px 3px 0px rgba(255,60,60,0.25)' }}
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
