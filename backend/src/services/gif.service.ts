const TENOR_API_KEY = process.env.TENOR_API_KEY ?? '';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const MEDIA_FILTER = 'gif,tinygif';
const LIMIT = 24;

interface TenorResult {
  id: string;
  media_formats: {
    gif?: { url: string; dims: number[] };
    tinygif?: { url: string; dims: number[] };
  };
}

function mapResult(r: TenorResult) {
  return {
    id: r.id,
    url: r.media_formats.gif?.url ?? '',
    preview_url: r.media_formats.tinygif?.url ?? r.media_formats.gif?.url ?? '',
    width: r.media_formats.gif?.dims[0] ?? 0,
    height: r.media_formats.gif?.dims[1] ?? 0,
  };
}

export async function searchGifs(query: string) {
  const url = `${TENOR_BASE}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&media_filter=${MEDIA_FILTER}&limit=${LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Tenor search failed');
  const data = await res.json() as { results: TenorResult[] };
  return (data.results ?? []).map(mapResult);
}

export async function trendingGifs() {
  const url = `${TENOR_BASE}/featured?key=${TENOR_API_KEY}&media_filter=${MEDIA_FILTER}&limit=${LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Tenor trending failed');
  const data = await res.json() as { results: TenorResult[] };
  return (data.results ?? []).map(mapResult);
}
