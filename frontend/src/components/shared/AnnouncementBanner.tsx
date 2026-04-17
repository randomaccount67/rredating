'use client';
import { useState, useEffect } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/announcements/active`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.announcement) {
          const key = `announcement_dismissed_${data.announcement.id}`;
          if (sessionStorage.getItem(key)) {
            setDismissed(true);
          }
          setAnnouncement(data.announcement);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    if (announcement) {
      sessionStorage.setItem(`announcement_dismissed_${announcement.id}`, '1');
    }
    setDismissed(true);
  }

  if (!announcement || dismissed) return null;

  return (
    <div className="w-full bg-[#1C1A10] border-y border-[#FFE84D]/20 py-2.5 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Megaphone icon */}
        <svg
          className="flex-shrink-0 text-[#FFE84D]"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11l19-9-9 19-2-8-8-2z" />
        </svg>

        <p className="flex-1 text-[#E8D97A] text-sm leading-snug">
          {announcement.content}
        </p>

        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="flex-shrink-0 text-[#8B7F40] hover:text-[#FFE84D] transition-colors p-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
