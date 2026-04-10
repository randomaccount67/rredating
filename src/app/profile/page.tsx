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
    favorite_artist: '', age: 18,
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
              age: data.profile.age ?? 18,
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
  }, [router]);

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
        body: JSON.stringify({ ...form, gender: resolvedGender, avatar_url, age: form.age }),
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
        <div className="bg-[#1B1814] border-2 border-[#2F2B24] h-96 animate-pulse" />
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? profile?.avatar_url;

  const section = "bg-[#1B1814] border-2 border-[#2F2B24]";
  const inputCls = "w-full bg-[#131009] border-2 border-[#2F2B24] px-3 py-2 text-sm focus:border-[#FF4655] outline-none text-[#F2EDE4] transition-colors";
  const chipBase = "px-3 py-1.5 text-xs font-mono border-2 transition-all cursor-pointer";
  const chipOff  = `${chipBase} border-[#2F2B24] text-[#857A6A] hover:border-[#3A3530] hover:text-[#F2EDE4]`;
  const chipOnLime = `${chipBase} border-[#FF4655] bg-[#FF4655]/8 text-[#FF4655]`;
  const chipOnCyan = `${chipBase} border-[#00D4FF] bg-[#00D4FF]/8 text-[#00D4FF]`;
  const chipOnPurple = `${chipBase} border-[#8B6FFF] bg-[#8B6FFF]/8 text-[#8B6FFF]`;

  const SectionHeader = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-4 h-[2px]" style={{ background: color }} />
      <span className="font-mono text-[9px] tracking-widest uppercase text-[#4A4440]">{children}</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-[2px] bg-[#FF4655]" />
          <span className="font-mono text-[10px] text-[#4A4440] tracking-widest uppercase">MY PROFILE</span>
        </div>
        <h1 className="font-black text-5xl uppercase text-[#F2EDE4]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          EDIT PROFILE
        </h1>
      </div>

      <div className="space-y-4">
        {/* Avatar */}
        <div className={section} style={{ borderTop: '3px solid #FF4655' }}>
          <div className="p-5">
            <SectionHeader color="#FF4655">PROFILE PICTURE</SectionHeader>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 bg-[#131009] border-2 border-[#2F2B24] cursor-pointer hover:border-[#FF4655] overflow-hidden flex items-center justify-center transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayAvatar ? (
                  <Image src={displayAvatar} alt="avatar" width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <Upload size={22} className="text-[#4A4440]" />
                )}
              </div>
              <div>
                <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs py-1.5 px-3">
                  CHANGE PHOTO
                </button>
                <p className="label mt-1.5">MAX 8MB · IMAGES ONLY</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Identity */}
        <div className={section} style={{ borderTop: '3px solid #00D4FF' }}>
          <div className="p-5">
            <SectionHeader color="#00D4FF">IDENTITY</SectionHeader>

            <div className="mb-4">
              <label className="label block mb-2">GENDER</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <button key={g} type="button" onClick={() => set('gender', g)}
                    className={form.gender === g ? chipOnLime : chipOff}>
                    {g}
                  </button>
                ))}
              </div>
              {form.gender === 'Other' && (
                <input
                  className={inputCls}
                  placeholder="describe yourself"
                  value={form.gender_other}
                  onChange={e => set('gender_other', e.target.value)}
                  maxLength={50}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label block mb-1.5">RIOT ID</label>
                <input className={inputCls} value={form.riot_id} onChange={e => set('riot_id', e.target.value)} placeholder="REYNA" />
              </div>
              <div>
                <label className="label block mb-1.5">TAG</label>
                <input className={inputCls} value={form.riot_tag} onChange={e => set('riot_tag', e.target.value)} placeholder="FRAG" />
              </div>
            </div>

            <div>
              <label className="label block mb-1.5">REGION</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => set('region', r)}
                    className={form.region === r ? chipOnLime : chipOff}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label block mb-1.5">AGE</label>
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
            </div>
          </div>
        </div>

        {/* Ranks */}
        <div className={section} style={{ borderTop: '3px solid #FFB800' }}>
          <div className="p-5">
            <SectionHeader color="#FFB800">COMPETITIVE</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1.5">PEAK RANK</label>
                <select className={inputCls} value={form.peak_rank} onChange={e => set('peak_rank', e.target.value)}>
                  <option value="">--</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">CURRENT RANK</label>
                <select className={inputCls} value={form.current_rank} onChange={e => set('current_rank', e.target.value)}>
                  <option value="">--</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Playstyle */}
        <div className={section} style={{ borderTop: '3px solid #FF3C3C' }}>
          <div className="p-5">
            <SectionHeader color="#FF3C3C">PLAYSTYLE</SectionHeader>

            <div className="mb-4">
              <label className="label block mb-1.5">ROLE</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(r => (
                  <button key={r} type="button" onClick={() => set('role', r)}
                    className={form.role === r ? chipOnLime : chipOff}
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label block mb-1.5">AGENTS (UP TO 3)</label>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map(a => (
                  <button key={a} type="button" onClick={() => toggleArrayItem('agents', a, 3)}
                    className={form.agents.includes(a) ? chipOnCyan : chipOff}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className={section} style={{ borderTop: '3px solid #8B6FFF' }}>
          <div className="p-5">
            <SectionHeader color="#8B6FFF">PERSONALITY</SectionHeader>

            <div className="mb-4">
              <label className="label block mb-1.5">MUSIC TASTE</label>
              <div className="flex flex-wrap gap-2">
                {MUSIC_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleArrayItem('music_tags', tag)}
                    className={form.music_tags.includes(tag) ? chipOnPurple : chipOff}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label block mb-1.5">FAVORITE ARTIST</label>
              <input
                className={inputCls}
                value={form.favorite_artist}
                onChange={e => set('favorite_artist', e.target.value)}
                placeholder="who are you listening to"
                maxLength={100}
              />
            </div>

            <div>
              <label className="label block mb-1.5">ABOUT (280 CHARS)</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={4}
                maxLength={280}
                value={form.about}
                onChange={e => set('about', e.target.value)}
              />
              <p className="label text-right mt-1">{form.about.length}/280</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-[#FF3C3C] text-sm bg-[#FF3C3C]/5 border-2 border-[#FF3C3C]/20 px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 font-black text-sm uppercase tracking-wider transition-all bg-[#FF4655] text-white hover:bg-[#FF5F6D] disabled:opacity-50"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '4px 4px 0px rgba(255,70,85,0.25)' }}
        >
          {saved ? <><Check size={16} /> SAVED</> : saving ? 'SAVING...' : <><Save size={16} /> SAVE CHANGES</>}
        </button>

        {/* Danger zone */}
        <div className="bg-[#1B1814] border-2 border-[#FF3C3C]/20" style={{ borderTop: '3px solid #FF3C3C' }}>
          <div className="p-5">
            <SectionHeader color="#FF3C3C">DANGER ZONE</SectionHeader>
            <p className="text-[#857A6A] text-sm mb-4">
              Permanently delete your account, profile, and all associated data. This cannot be undone.
            </p>
            {deleteError && (
              <div className="flex items-center gap-2 text-[#FF3C3C] text-sm bg-[#FF3C3C]/5 border-2 border-[#FF3C3C]/20 px-3 py-2 mb-3">
                <AlertTriangle size={12} /> {deleteError}
              </div>
            )}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-xs font-bold uppercase border-2 border-[#FF3C3C]/40 text-[#FF3C3C] hover:bg-[#FF3C3C]/8 transition-all"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                DELETE ACCOUNT
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-black uppercase bg-[#FF3C3C] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', boxShadow: '3px 3px 0px rgba(255,60,60,0.25)' }}
                >
                  {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-bold uppercase border-2 border-[#2F2B24] text-[#857A6A] hover:border-[#3A3530] transition-all disabled:opacity-50"
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
