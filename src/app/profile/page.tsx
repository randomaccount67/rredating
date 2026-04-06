'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { Upload, Save, Check, AlertTriangle } from 'lucide-react';
import { RANKS, REGIONS, ROLES, MUSIC_TAGS, AGENTS, Profile } from '@/types';

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [form, setForm] = useState({
    gender: '', gender_other: '',
    riot_id: '', riot_tag: '', region: '', peak_rank: '', current_rank: '',
    role: '', agents: [] as string[], music_tags: [] as string[], about: '',
    favorite_artist: '',
  });

  useEffect(() => {
    async function fetch_profile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            const storedGender = data.profile.gender ?? '';
            const isCustomGender = storedGender && !['Male', 'Female', 'Other'].includes(storedGender);
            setForm({
              gender: isCustomGender ? 'Other' : storedGender,
              gender_other: isCustomGender ? storedGender : '',
              riot_id: data.profile.riot_id ?? '',
              riot_tag: data.profile.riot_tag ?? '',
              region: data.profile.region ?? '',
              peak_rank: data.profile.peak_rank ?? '',
              current_rank: data.profile.current_rank ?? '',
              role: data.profile.role ?? '',
              agents: data.profile.agents ?? [],
              music_tags: data.profile.music_tags ?? [],
              about: data.profile.about ?? '',
              favorite_artist: data.profile.favorite_artist ?? '',
            });
          } else {
            router.replace('/onboarding');
            return;
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
      const resolvedGender = form.gender === 'Other'
        ? (form.gender_other.trim() || 'Other')
        : form.gender || null;

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, gender: resolvedGender, avatar_url }),
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

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Deletion failed');
      }
      await signOut();
      router.push('/');
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Deletion failed');
      setDeleting(false);
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
          <div className="mb-4">
            <label className="label block mb-2">GENDER</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Male', 'Female', 'Other'].map(g => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={`px-4 py-1.5 text-xs font-mono border transition-all ${form.gender === g ? 'border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]' : 'border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566]'}`}>
                  {g}
                </button>
              ))}
            </div>
            {form.gender === 'Other' && (
              <input
                className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none font-mono"
                placeholder="describe yourself"
                value={form.gender_other}
                onChange={e => set('gender_other', e.target.value)}
                maxLength={50}
              />
            )}
          </div>
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
          <div className="mb-4">
            <label className="label block mb-2">FAVORITE ARTIST</label>
            <input
              className="w-full bg-[#13151A] border border-[#2A2D35] px-3 py-2 text-sm focus:border-[#FF4655] outline-none font-mono"
              value={form.favorite_artist}
              onChange={e => set('favorite_artist', e.target.value)}
              placeholder="who are you listening to"
              maxLength={100}
            />
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

        {/* Danger zone */}
        <div className="bg-[#1A1D24] border border-[#FF4655]/20 p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <label className="label block mb-2 text-[#FF4655]">// DANGER ZONE</label>
          <p className="text-[#8B8FA8] text-xs mb-4">
            Permanently delete your account, profile, and all associated data. This cannot be undone.
          </p>
          {deleteError && (
            <div className="flex items-center gap-2 text-[#FF4655] text-xs font-mono bg-[#FF4655]/5 border border-[#FF4655]/20 px-3 py-2 mb-3">
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
                className="px-4 py-2 text-xs font-bold uppercase bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold uppercase border border-[#2A2D35] text-[#8B8FA8] hover:border-[#525566] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                CANCEL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
