'use client';

interface Props {
  trackUrl: string;
}

function extractTrackId(url: string): string | null {
  // Match track ID up to any query/hash — [A-Za-z0-9]+ stops before '?' or '#'
  const m = url.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  return m?.[1] ?? null;
}

export default function SpotifyPlayer({ trackUrl }: Props) {
  const trackId = extractTrackId(trackUrl);
  if (!trackId) return null;
  return (
    <iframe
      src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
      width="100%"
      height="80"
      style={{ border: 'none', borderRadius: 8, display: 'block' }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
