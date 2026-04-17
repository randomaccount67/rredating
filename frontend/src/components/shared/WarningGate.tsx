'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApi } from '@/lib/api';

interface ActiveWarning {
  id: string;
  message: string;
  created_at: string;
}

export default function WarningGate({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const [warnings, setWarnings] = useState<ActiveWarning[]>([]);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    api('/api/warnings/active')
      .then(r => (r.ok ? r.json() : { warnings: [] }))
      .then(d => setWarnings(d.warnings ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcknowledge = async () => {
    const current = warnings[0];
    if (!current || acknowledging) return;
    setAcknowledging(true);
    try {
      await api(`/api/warnings/${current.id}/acknowledge`, { method: 'POST' });
      setWarnings(prev => prev.slice(1));
    } catch { /* non-critical */ }
    finally { setAcknowledging(false); }
  };

  const current = warnings[0];

  return (
    <>
      {children}
      {current && (
        <div className="fixed inset-0 z-[9998] bg-black/95 flex items-center justify-center px-4">
          <div
            className="bg-[#1A1D24] border-2 border-[#FF4655] max-w-md w-full p-8"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center mb-6">
              <AlertTriangle size={40} className="text-[#FF4655] mb-4" />
              <span className="font-mono text-[10px] tracking-widest text-[#FF4655] uppercase mb-1">
                OFFICIAL NOTICE
              </span>
              <h2
                className="font-extrabold text-3xl uppercase text-[#E8EAF0]"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                WARNING FROM ADMIN
              </h2>
            </div>

            {/* Message */}
            <div className="bg-[#13151A] border border-[#FF4655]/30 px-4 py-4 mb-4">
              <p className="text-[#E8EAF0] text-sm leading-relaxed whitespace-pre-wrap">
                {current.message}
              </p>
            </div>

            {/* Meta */}
            <p className="font-mono text-[9px] text-[#525566] text-center mb-6">
              Issued {new Date(current.created_at).toLocaleString()}
              {warnings.length > 1 && (
                <span className="text-[#FF4655] ml-2">
                  · {warnings.length} warning{warnings.length > 1 ? 's' : ''} pending
                </span>
              )}
            </p>

            {/* Acknowledge */}
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="w-full py-3 font-black text-sm uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {acknowledging ? 'CONFIRMING...' : 'I UNDERSTAND'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
