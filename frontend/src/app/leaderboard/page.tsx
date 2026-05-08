'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  riot_id: string | null;
  riot_tag: string | null;
  texting_rank: string;
  texting_rr: number;
  avatar_url: string | null;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then(r => r.json())
      .then(d => setEntries(d.leaderboard ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <span className="label text-[#FF4655]">// RANKED</span>
        <h1
          className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-1"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          RANKED LEADERBOARD
        </h1>
        <p className="text-[#525566] text-sm font-mono mt-2">Hit Immortal or higher to be displayed here</p>
      </div>

      {loading && (
        <div className="bg-[#1A1D24] border border-[#2A2D35] h-64 animate-pulse" />
      )}

      {!loading && entries !== null && entries.length === 0 && (
        <div
          className="bg-[#171A22] border border-[#252830] p-10 text-center"
          style={{ borderTop: '3px solid #FF4655' }}
        >
          <p className="text-[#525566] font-mono text-sm">
            No one has reached Immortal yet. Will you be the first?
          </p>
          <Link
            href="/settings"
            className="inline-block mt-4 text-[#00E5FF] font-mono text-xs hover:underline"
          >
            Enable Ranked Mode →
          </Link>
        </div>
      )}

      {!loading && entries !== null && entries.length > 0 && (
        <div
          className="bg-[#171A22] border border-[#252830]"
          style={{ borderTop: '3px solid #FF4655' }}
        >
          {entries.map((entry, i) => {
            const name = entry.riot_id
              ? `${entry.riot_id}#${entry.riot_tag ?? ''}`
              : 'UNKNOWN';
            return (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 border-b border-[#252830] last:border-0"
              >
                <span className="font-mono text-[#525566] text-sm w-6 flex-shrink-0">#{i + 1}</span>
                <div
                  className="w-8 h-8 bg-[#13151A] border border-[#2A2D35] overflow-hidden flex-shrink-0"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}
                >
                  {entry.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[#525566] text-xs">
                      {entry.riot_id?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-[#E8EAF0] truncate">{name}</p>
                  <p className="font-mono text-[10px] text-[#525566]">{entry.texting_rank}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className="font-bold text-sm text-[#FF4655]"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    {entry.texting_rr} RR
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
