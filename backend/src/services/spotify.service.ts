const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? '';

// In-memory token cache — shared across all requests
interface TokenCache { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Spotify token request failed');
  const data = await res.json() as { access_token: string; expires_in: number };
  // Subtract 60 s from expiry so we never use an about-to-expire token
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

function extractTrackId(url: string): string | null {
  const http = url.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  if (http) return http[1];
  const uri = url.match(/spotify:track:([A-Za-z0-9]+)/);
  if (uri) return uri[1];
  return null;
}

export interface TrackPreview {
  preview_url: string | null;
  track_name: string;
  artist_name: string;
  album_art: string | null;
}

export async function getTrackPreview(trackUrl: string): Promise<TrackPreview> {
  const trackId = extractTrackId(trackUrl);
  if (!trackId) throw new Error('Invalid Spotify URL');

  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Spotify track fetch failed');

  const track = await res.json() as {
    preview_url: string | null;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  };

  return {
    preview_url: track.preview_url ?? null,
    track_name: track.name,
    artist_name: track.artists[0]?.name ?? 'Unknown Artist',
    album_art: track.album.images[0]?.url ?? null,
  };
}
