'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useApi } from '@/lib/api';

interface GifResult {
  id: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  onSend: (url: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSend, onClose }: GifPickerProps) {
  const api = useApi();
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGifs = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const endpoint = q ? `/api/gifs/search?q=${encodeURIComponent(q)}` : '/api/gifs/trending';
      const res = await api(endpoint);
      if (res.ok) {
        const data = await res.json();
        setGifs(data.gifs ?? []);
      }
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [api]);

  // Load trending on mount
  useEffect(() => { fetchGifs(''); }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchGifs(query), 400);
    return () => clearTimeout(timer);
  }, [query, fetchGifs]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="bg-[#1A1D24] border border-[#2A2D35] w-80 max-h-96 flex flex-col overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 p-2 border-b border-[#2A2D35] flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#525566]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            className="w-full bg-[#13151A] border border-[#2A2D35] pl-6 pr-2 py-1.5 text-xs text-[#E8EAF0] placeholder-[#525566] outline-none focus:border-[#00E5FF]/40"
          />
        </div>
        <button onClick={onClose} className="text-[#525566] hover:text-[#E8EAF0] transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* GIF grid */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#13151A] animate-pulse" />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-mono text-[10px] text-[#525566]">No GIFs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSend(gif.url)}
                className="aspect-square overflow-hidden hover:opacity-80 transition-opacity bg-[#13151A]"
              >
                <img
                  src={gif.preview_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tenor attribution */}
      <div className="px-2 py-1.5 border-t border-[#2A2D35] flex-shrink-0">
        <p className="font-mono text-[8px] text-[#525566] text-right">Powered by GIPHY</p>
      </div>
    </div>
  );
}
