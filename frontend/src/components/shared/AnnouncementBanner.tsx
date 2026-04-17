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

  useEffect(() => {
    fetch(`${API_URL}/api/announcements/active`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.announcement) {
          setAnnouncement(data.announcement);
        }
      })
      .catch(() => {});
  }, []);

  if (!announcement) return null;

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
      </div>
    </div>
  );
}
