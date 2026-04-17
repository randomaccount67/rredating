'use client';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

interface PreviewData {
  preview_url: string | null;
  track_name: string;
  artist_name: string;
  album_art: string | null;
}

// Module-level cache — survives remounts within the session
const previewCache = new Map<string, PreviewData>();

interface SpotifyPlayerProps {
  trackUrl: string;
  startTime?: number;
  accentColor: string;
}

export default function SpotifyPlayer({ trackUrl, startTime = 0, accentColor }: SpotifyPlayerProps) {
  const [preview, setPreview] = useState<PreviewData | null>(() => previewCache.get(trackUrl) ?? null);
  const [loading, setLoading] = useState(!previewCache.has(trackUrl));
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('profile-music-muted') === '1';
  });
  const [volume, setVolume] = useState(0.15);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // Fetch preview data
  useEffect(() => {
    if (previewCache.has(trackUrl)) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/api/spotify/preview?url=${encodeURIComponent(trackUrl)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()) as Promise<PreviewData>)
      .then(d => {
        if (cancelled) return;
        previewCache.set(trackUrl, d);
        setPreview(d);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [trackUrl]);

  // Listen for stop events dispatched by other player instances
  useEffect(() => {
    const stop = (e: Event) => {
      const except = (e as CustomEvent<{ except: HTMLAudioElement | null }>).detail?.except;
      if (audioRef.current && audioRef.current !== except) {
        audioRef.current.pause();
        cancelAnimationFrame(rafRef.current);
        setPlaying(false);
      }
    };
    window.addEventListener('spotify-stop', stop);
    return () => window.removeEventListener('spotify-stop', stop);
  }, []);

  // Pause and clean up audio when the component unmounts (modal closed, page navigated)
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  function startTracking() {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const el = audioRef.current;
      if (!el || el.paused) return;
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function togglePlay() {
    if (!preview?.preview_url) return;

    if (playing) {
      audioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
      return;
    }

    // Create the Audio element on first play (avoids SSR issues)
    if (!audioRef.current) {
      const audio = new Audio(preview.preview_url);
      audio.volume = muted ? 0 : volume;
      if (startTime > 0) audio.currentTime = startTime;
      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
        cancelAnimationFrame(rafRef.current);
      };
      audioRef.current = audio;
    }

    // Stop every other active player first
    window.dispatchEvent(new CustomEvent('spotify-stop', { detail: { except: audioRef.current } }));

    audioRef.current.play()
      .then(() => { setPlaying(true); startTracking(); })
      .catch(() => setPlaying(false));
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    sessionStorage.setItem('profile-music-muted', next ? '1' : '0');
    if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current && !muted) audioRef.current.volume = v;
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0D0F14]">
        <div className="w-9 h-9 rounded-full bg-[#1A1D24] animate-pulse flex-shrink-0" />
        <div className="w-9 h-9 rounded bg-[#1A1D24] animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 bg-[#1A1D24] animate-pulse rounded w-3/4" />
          <div className="h-2 bg-[#1A1D24] animate-pulse rounded w-1/2" />
          <div className="h-1 bg-[#1A1D24] animate-pulse rounded mt-2" />
        </div>
      </div>
    );
  }

  // ── Preview unavailable ─────────────────────────────────────────
  if (!preview?.preview_url) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#0D0F14]">
        {preview?.album_art && (
          <img src={preview.album_art} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 opacity-50" loading="lazy" />
        )}
        <div className="min-w-0">
          {preview?.track_name && (
            <p className="text-[#525566] text-xs font-semibold truncate">{preview.track_name}</p>
          )}
          <p className="font-mono text-[9px] text-[#3A3A3A] uppercase tracking-widest">preview unavailable</p>
        </div>
      </div>
    );
  }

  // ── Player ──────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#0D0F14]">
      {/* Play / pause */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{
          backgroundColor: accentColor,
          boxShadow: playing ? `0 0 16px ${accentColor}80` : `0 0 4px ${accentColor}30`,
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing
          ? <Pause size={14} fill="white" className="text-white" />
          : <Play size={14} fill="white" className="text-white" style={{ marginLeft: 1 }} />
        }
      </button>

      {/* Album art */}
      {preview.album_art && (
        <img
          src={preview.album_art}
          alt=""
          className="w-9 h-9 rounded object-cover flex-shrink-0"
          loading="lazy"
        />
      )}

      {/* Track info + progress bar */}
      <div className="flex-1 min-w-0">
        <p className="text-[#E8EAF0] text-xs font-semibold truncate leading-tight">{preview.track_name}</p>
        <p className="text-[#525566] text-[10px] truncate">{preview.artist_name}</p>
        <div
          className="mt-1.5 h-1 bg-[#252830] rounded-full overflow-hidden cursor-pointer"
          onClick={handleProgressClick}
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${progress * 100}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      {/* Volume slider */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={handleVolume}
        className="w-10 flex-shrink-0 cursor-pointer"
        style={{ accentColor, height: 3 }}
        aria-label="Volume"
      />

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="flex-shrink-0 text-[#525566] hover:text-[#E8EAF0] transition-colors"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>
    </div>
  );
}
