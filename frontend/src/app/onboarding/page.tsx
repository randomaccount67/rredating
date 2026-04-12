'use client';
import { useApi } from '@/lib/api';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { Upload, Check, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { RANKS, REGIONS, ROLES, MUSIC_TAGS, AGENTS } from '@/types';

function getRankIndex(rank: string): number {
  return RANKS.indexOf(rank as typeof RANKS[number]);
}

const STEPS = ['IDENTITY', 'RANK', 'PLAYSTYLE', 'PERSONALITY', 'LEGAL'];

export default function OnboardingPage() {
  const api = useApi();

  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    gender: '',
    gender_other: '',
    riot_id: '',
    riot_tag: '',
    region: '',
    peak_rank: '',
    current_rank: '',
    role: '',
    agents: [] as string[],
    music_tags: [] as string[],
    favorite_artist: '',
    about: '',
    confirmed_18: false,
    age: 18,
  });

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key: 'agents' | 'music_tags', item: string, max?: number) => {
    setForm(prev => {
      const arr = prev[key] as string[];
      if (arr.includes(item)) return { ...prev, [key]: arr.filter(i => i !== item) };
      if (max && arr.length >= max) return prev;
      return { ...prev, [key]: [...arr, item] };
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Images only.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Max 8MB.'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.confirmed_18) { setError('You must confirm you are 18+.'); return; }
    if (!form.riot_id || !form.riot_tag) { setError('Riot ID required.'); return; }
    if (form.current_rank && form.peak_rank && getRankIndex(form.current_rank) > getRankIndex(form.peak_rank)) {
      setError('Current rank cannot be higher than peak rank.'); setStep(1); return;
    }

    setSubmitting(true);
    setError('');

    try {
      let avatar_url = null;

      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const upRes = await api('/api/upload', { method: 'POST', body: fd });
        if (upRes.ok) {
          const { url } = await upRes.json();
          avatar_url = url;
        }
      }

      const resolvedGender = form.gender === 'Other'
        ? (form.gender_other.trim() || 'Other')
        : form.gender || null;

      const res = await api('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ ...form, gender_other: undefined, gender: resolvedGender, avatar_url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      router.push('/match');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = [
    // Step 0: Identity
    <div key="identity" className="space-y-6">
      <div>
        <label className="label block mb-2">PROFILE PICTURE</label>
        <div
          className="w-24 h-24 border-2 border-dashed border-[#2A2D35] flex items-center justify-center cursor-pointer hover:border-[#FF4655] transition-colors relative overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
          style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <Upload size={24} className="text-[#525566]" />
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <p className="label mt-1">MAX 8MB · IMAGES ONLY</p>
      </div>

      <div>
        <label className="label block mb-2">GENDER</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {['Male', 'Female', 'Other'].map(g => (
            <button
              key={g} type="button"
              onClick={() => set('gender', g)}
              className={`px-4 py-2 text-xs font-mono border transition-all ${form.gender === g ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}
            >
              {g}
            </button>
          ))}
        </div>
        {form.gender === 'Other' && (
          <input
            className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none"
            placeholder="describe yourself"
            value={form.gender_other}
            onChange={e => set('gender_other', e.target.value)}
            maxLength={50}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label block mb-2">RIOT ID *</label>
          <input
            className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none"
            placeholder="i miss her"
            value={form.riot_id}
            onChange={e => set('riot_id', e.target.value)}
          />
        </div>
        <div>
          <label className="label block mb-2">TAG *</label>
          <input
            className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none"
            placeholder="smurf"
            value={form.riot_tag}
            onChange={e => set('riot_tag', e.target.value)}
            maxLength={5}
          />
        </div>
      </div>

      <div>
        <label className="label block mb-2">REGION</label>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(r => (
            <button
              key={r} type="button"
              onClick={() => set('region', r)}
              className={`px-4 py-2 text-xs font-mono border transition-all ${form.region === r ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label block mb-2">AGE</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="18"
            max="99"
            value={form.age}
            onChange={e => set('age', parseInt(e.target.value, 10))}
            className="flex-1 accent-[#FF4655] cursor-pointer"
          />
          <span className="font-mono text-xl font-bold text-[#FF4655] w-10 text-center flex-shrink-0">
            {form.age}
          </span>
        </div>
        <p className="label mt-1">MINIMUM AGE IS 18</p>
      </div>
    </div>,

    // Step 1: Rank
    <div key="rank" className="space-y-6">
      <p className="text-xs text-[#FF4655]/70 italic">larpers will be executed on sight</p>
      <div>
        <label className="label block mb-2">PEAK RANK</label>
        <select
          className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none text-[#E8EAF0]"
          value={form.peak_rank}
          onChange={e => set('peak_rank', e.target.value)}
        >
          <option value="">-- SELECT --</option>
          {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="label block mb-2">CURRENT RANK</label>
        <select
          className={`w-full bg-[#13151A] border px-3 py-2 text-sm focus:border-[#FF4655] outline-none text-[#E8EAF0] ${
            form.current_rank && form.peak_rank && getRankIndex(form.current_rank) > getRankIndex(form.peak_rank)
              ? 'border-[#FF4655]'
              : 'border-[#2A2D35]'
          }`}
          value={form.current_rank}
          onChange={e => set('current_rank', e.target.value)}
        >
          <option value="">-- SELECT --</option>
          {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {form.current_rank && form.peak_rank && getRankIndex(form.current_rank) > getRankIndex(form.peak_rank) && (
          <p className="text-xs text-[#FF4655] mt-1">Current rank can&apos;t be higher than peak rank.</p>
        )}
      </div>
    </div>,

    // Step 2: Playstyle
    <div key="playstyle" className="space-y-6">
      <div>
        <label className="label block mb-2">PRIMARY ROLE</label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => (
            <button
              key={r} type="button"
              onClick={() => set('role', r)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-all ${form.role === r ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label block mb-2">MAIN AGENTS (PICK UP TO 3)</label>
        <div className="flex flex-wrap gap-2">
          {AGENTS.map(a => (
            <button
              key={a} type="button"
              onClick={() => toggleArrayItem('agents', a, 3)}
              className={`px-3 py-1.5 text-xs font-mono border transition-all ${form.agents.includes(a) ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}
            >
              {form.agents.includes(a) && <Check size={10} className="inline mr-1" />}
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 3: Personality
    <div key="personality" className="space-y-6">
      <div>
        <label className="label block mb-2">MUSIC TASTE</label>
        <div className="flex flex-wrap gap-2">
          {MUSIC_TAGS.map(tag => (
            <button
              key={tag} type="button"
              onClick={() => toggleArrayItem('music_tags', tag)}
              className={`px-4 py-2 text-xs font-mono border transition-all ${form.music_tags.includes(tag) ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}
            >
              {form.music_tags.includes(tag) && <Check size={10} className="inline mr-1" />}
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label block mb-2">FAVORITE ARTIST</label>
        <input
          className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none"
          placeholder="who are you listening to"
          value={form.favorite_artist}
          onChange={e => set('favorite_artist', e.target.value)}
          maxLength={100}
        />
      </div>

      <div>
        <label className="label block mb-2">ABOUT (280 CHARS MAX)</label>
        <textarea
          className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none resize-none"
          rows={4}
          maxLength={280}
          placeholder="peak was diamond 3 last act. currently hardstuck plat. will rage if you dodge. good vibes only (liar)."
          value={form.about}
          onChange={e => set('about', e.target.value)}
        />
        <p className="label text-right mt-1">{form.about.length}/280</p>
      </div>
    </div>,

    // Step 4: Legal
    <div key="legal" className="space-y-6">
      <div className="bg-[#FF4655]/5 border border-[#FF4655]/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#FF4655] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm uppercase tracking-wide text-[#FF4655]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              AGE VERIFICATION REQUIRED
            </p>
            <p className="text-[#8B8FA8] text-xs mt-1">
              RRedating is for adults 18+ only. By checking the box below, you confirm you are at least 18 years old.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#13151A] border border-[#2A2D35] p-4">
        <p className="text-[#8B8FA8] text-xs leading-relaxed">
          <strong className="text-[#E8EAF0]">RRedating</strong> is a fan-made, community project and is{' '}
          <strong className="text-[#FF4655]">NOT affiliated with, endorsed by, or connected to Riot Games</strong>{' '}
          in any way. Valorant and all related marks are trademarks of Riot Games, Inc.
          This site exists for entertainment purposes only. By creating an account you agree to our{' '}
          <a href="/terms" target="_blank" className="text-[#FF4655] hover:underline">Terms of Service</a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" className="text-[#FF4655] hover:underline">Privacy Policy</a>.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => set('confirmed_18', !form.confirmed_18)}
          className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer ${form.confirmed_18 ? 'border-[#FF4655] bg-[#FF4655]' : 'border-[#2A2D35] group-hover:border-[#FF4655]'}`}
        >
          {form.confirmed_18 && <Check size={12} className="text-white" />}
        </div>
        <span className="text-[#E8EAF0] text-sm">
          I confirm I am <strong className="text-[#FF4655]">18 years of age or older</strong> and I agree to the Terms of Service and Privacy Policy.
        </span>
      </label>
    </div>,
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <span className="text-[#525566] font-mono text-[10px] tracking-widest uppercase">// AGENT BRIEFING</span>
          <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            SET UP PROFILE
          </h1>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col gap-1">
              <div className={`h-0.5 transition-all ${i <= step ? 'bg-[#FF4655]' : 'bg-[#2A2D35]'}`} />
              <span className={`label text-[9px] ${i === step ? 'text-[#FF4655]' : i < step ? 'text-[#525566]' : 'text-[#2A2D35]'}`}>{s}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6 mb-4"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          {stepContent[step]}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-[#FF4655] text-sm mb-4 bg-[#FF4655]/5 border border-[#FF4655]/20 px-3 py-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> BACK
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-1 btn-primary"
            >
              NEXT <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !form.confirmed_18}
              className="flex items-center gap-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'DEPLOYING...' : 'DEPLOY AGENT'}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
