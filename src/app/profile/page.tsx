'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { Upload, Save, Check, AlertTriangle } from 'lucide-react';
import { RANKS, REGIONS, ROLES, MUSIC_TAGS, AGENTS, Profile } from '@/types';

export default function ProfilePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    riot_id: '', riot_tag: '', region: '', peak_rank: '', current_rank: '',
    role: '', agents: [] as string[], music_tags: [] as string[], about: '',
  });

  useEffect(() => {
    async function fetch_profile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            setForm({
              riot_id: data.profile.riot_id ?? '',
              riot_tag: data.profile.riot_tag ?? '',
              region: data.profile.region ?? '',
              peak_rank: data.profile.peak_rank ?? '',
              current_rank: data.profile.current_rank ?? '',
              role: data.profile.role ?? '',
              agents: data.profile.agents ?? [],
              music_tags: data.profile.music_tags ?? [],
              about: data.profile.about ?? '',
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetch_profile();
  }, []);

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
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let avatar_url = profile?.avatar_url ?? null;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (upRes.ok) {
          const { url } = await upRes.json();
          avatar_url = url;
        }
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatar_url }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1A1D24] border border-[#2A2D35] h-96 animate-pulse" />
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? profile?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <span className="label text-[#FF4655]">// MY PROFILE</span>
        <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          EDIT PROFILE
        </h1>
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <label className="label block mb-3">PROFILE PICTURE</label>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 bg-[#13151A] border border-[#2A2D35] cursor-pointer hover:border-[#FF4655] overflow-hidden flex items-center justify-center transition-colors"
              style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {displayAvatar ? (
                <Image src={displayAvatar} alt="avatar" width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <Upload size={24} className="text-[#525566]" />
              )}
            </div>
            <div>
              <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs py-1.5 px-3">
                CHANGE PHOTO
              </button>
              <p className="label mt-1">MAX 8MB · IMAGES ONLY</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Identity */}
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <label className="label block mb-4">IDENTITY</label>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label block mb-2">RIOT ID</label>
              <input className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none font-mono"
                value={form.riot_id} onChange={e => set('riot_id', e.target.value)} placeholder="REYNA" />
            </div>
            <div>
              <label className="label block mb-2">TAG</label>
              <input className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none font-mono"
                value={form.riot_tag} onChange={e => set('riot_tag', e.target.value)} placeholder="FRAG" />
            </div>
          </div>
          <div>
            <label className="label block mb-2">REGION</label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <button key={r} type="button" onClick={() => set('region', r)}
                  className={`px-4 py-1.5 text-xs font-mono border transition-all ${form.region === r ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ranks */}
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <label className="label block mb-4">COMPETITIVE</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label block mb-2">PEAK RANK</label>
              <select className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none font-mono text-[#E8EAF0]"
                value={form.peak_rank} onChange={e => set('peak_rank', e.target.value)}>
                <option value="">--</option>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-2">CURRENT RANK</label>
              <select className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none font-mono text-[#E8EAF0]"
                value={form.current_rank} onChange={e => set('current_rank', e.target.value)}>
                <option value="">--</option>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Playstyle */}
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <label className="label block mb-4">PLAYSTYLE</label>
          <div className="mb-4">
            <label className="label block mb-2">ROLE</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase border transition-all ${form.role === r ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label block mb-2">AGENTS (UP TO 3)</label>
            <div className="flex flex-wrap gap-2">
              {AGENTS.map(a => (
                <button key={a} type="button" onClick={() => toggleArrayItem('agents', a, 3)}
                  className={`px-3 py-1 text-xs font-mono border transition-all ${form.agents.includes(a) ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <label className="label block mb-4">PERSONALITY</label>
          <div className="mb-4">
            <label className="label block mb-2">MUSIC TASTE</label>
            <div className="flex flex-wrap gap-2">
              {MUSIC_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleArrayItem('music_tags', tag)}
                  className={`px-3 py-1 text-xs font-mono border transition-all ${form.music_tags.includes(tag) ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label block mb-2">ABOUT (280 CHARS)</label>
            <textarea
              className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none resize-none"
              rows={4} maxLength={280}
              value={form.about} onChange={e => set('about', e.target.value)}
            />
            <p className="label text-right mt-1">{form.about.length}/280</p>
          </div>
        </div>

        {/* Error / Save */}
        {error && (
          <div className="flex items-center gap-2 text-[#FF4655] text-xs font-mono bg-[#FF4655]/5 border border-[#FF4655]/20 px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase tracking-wider transition-all bg-[#FF4655] text-white hover:bg-[#FF5F6D] disabled:opacity-50"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          {saved ? <><Check size={16} /> SAVED</> : saving ? 'SAVING...' : <><Save size={16} /> SAVE CHANGES</>}
        </button>
      </div>
    </div>
  );
}
