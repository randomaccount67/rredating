'use client';
import { useApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AlertTriangle, Eye, Contrast, Check } from 'lucide-react';

export default function SettingsPage() {
  const api = useApi();
  const router = useRouter();
  const [colorblind, setColorblind] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setColorblind(localStorage.getItem('colorblind_mode') === 'true');
      setHighContrast(localStorage.getItem('high_contrast_mode') === 'true');
    } catch { /* ignore */ }
  }, []);

  const toggleColorblind = (val: boolean) => {
    setColorblind(val);
    try {
      localStorage.setItem('colorblind_mode', String(val));
      if (val) document.documentElement.setAttribute('data-colorblind', '');
      else document.documentElement.removeAttribute('data-colorblind');
    } catch { /* ignore */ }
  };

  const toggleHighContrast = (val: boolean) => {
    setHighContrast(val);
    try {
      localStorage.setItem('high_contrast_mode', String(val));
      if (val) document.documentElement.setAttribute('data-high-contrast', '');
      else document.documentElement.removeAttribute('data-high-contrast');
    } catch { /* ignore */ }
  };

  const handleSaveSettings = () => {
    // Settings are already persisted to localStorage on each toggle.
    // This button gives users explicit confirmation that settings are saved.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await api('/api/account', { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Deletion failed');
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Deletion failed');
      setDeleting(false);
    }
  };

  const Toggle = ({ checked, onChange, label, description, icon }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    label: string;
    description: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[#252830] last:border-0">
      <div className="flex items-center gap-3">
        <div className="text-[#525566]">{icon}</div>
        <div>
          <p className="text-sm font-bold text-[#E8EAF0]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{label}</p>
          <p className="text-[#525566] text-xs font-mono mt-0.5">{description}</p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#FF4655]' : 'bg-[#252830]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <span className="label text-[#FF4655]">// CONFIGURATION</span>
        <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          SETTINGS
        </h1>
      </div>

      <div className="space-y-4">
        {/* Accessibility */}
        <div className="bg-[#171A22] border border-[#252830]" style={{ borderTop: '3px solid #00E5FF' }}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-[2px] bg-[#00E5FF]" />
              <span className="font-mono text-[9px] tracking-widest uppercase text-[#505568]">ACCESSIBILITY</span>
            </div>
            <Toggle
              checked={colorblind}
              onChange={toggleColorblind}
              label="COLORBLIND MODE"
              description="Replaces red accents with amber/orange for red-green colorblindness"
              icon={<Eye size={16} />}
            />
            <Toggle
              checked={highContrast}
              onChange={toggleHighContrast}
              label="HIGH CONTRAST"
              description="Increases border and text contrast for better readability"
              icon={<Contrast size={16} />}
            />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveSettings}
          className="w-full flex items-center justify-center gap-2 py-3 font-black text-sm uppercase tracking-wider transition-all bg-[#FF4655] text-white hover:bg-[#FF5F6D]"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          {saved ? <><Check size={14} /> SAVED</> : 'SAVE SETTINGS'}
        </button>

        {/* Danger zone */}
        <div className="bg-[#171A22] border border-[#FF4655]/20" style={{ borderTop: '3px solid #FF4655' }}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-[2px] bg-[#FF4655]" />
              <span className="font-mono text-[9px] tracking-widest uppercase text-[#505568]">DANGER ZONE</span>
            </div>
            <p className="text-[#8B90A8] text-sm mb-4">
              Permanently delete your account, profile, and all associated data. This cannot be undone.
            </p>
            {deleteError && (
              <div className="flex items-center gap-2 text-[#FF4655] text-sm bg-[#FF4655]/5 border border-[#FF4655]/20 px-3 py-2 mb-3">
                <AlertTriangle size={12} /> {deleteError}
              </div>
            )}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-xs font-bold uppercase border border-[#FF4655]/40 text-[#FF4655] hover:bg-[#FF4655]/10 transition-all"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                DELETE ACCOUNT
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-black uppercase bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-all disabled:opacity-50"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                >
                  {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-bold uppercase border border-[#252830] text-[#525566] hover:border-[#525566] transition-all disabled:opacity-50"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
