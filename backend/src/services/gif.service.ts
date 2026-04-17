const GIPHY_API_KEY = process.env.GIPHY_API_KEY ?? '';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';
const LIMIT = 20;
const RATING = 'pg-13';

interface GiphyImages {
  url: string;
  width: string;
  height: string;
}

interface GiphyResult {
  id: string;
  images: {
    fixed_height: GiphyImages;
    fixed_height_small: GiphyImages;
    preview_gif: GiphyImages;
  };
}

function mapResult(r: GiphyResult) {
  return {
    id: r.id,
    url: r.images.fixed_height.url,
    preview_url: r.images.fixed_height_small?.url ?? r.images.preview_gif?.url ?? r.images.fixed_height.url,
    width: parseInt(r.images.fixed_height.width, 10),
    height: parseInt(r.images.fixed_height.height, 10),
  };
}

export async function searchGifs(query: string) {
  const url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${LIMIT}&rating=${RATING}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Giphy search failed');
  const data = await res.json() as { data: GiphyResult[] };
  return (data.data ?? []).map(mapResult);
}

export async function trendingGifs() {
  const url = `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${LIMIT}&rating=${RATING}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Giphy trending failed');
  const data = await res.json() as { data: GiphyResult[] };
  return (data.data ?? []).map(mapResult);
}
