type Artist = { id: string; name: string; images?: { url: string }[] };
type Genre = { name: string; weight: number; pct?: number };
export type SnapshotLike = {
  topArtists: { sixMonths: Artist[] };
  genres: Genre[];
};

export type CompareResult = {
  compatibility: number | null;
  sharedArtists: Artist[];
  sharedGenres: string[];
};

export function compareTaste(a: SnapshotLike | null, b: SnapshotLike | null): CompareResult {
  if (!a || !b) return { compatibility: null, sharedArtists: [], sharedGenres: [] };

  const artistsA = new Set(a.topArtists.sixMonths.map((x) => x.id));
  const artistsB = new Set(b.topArtists.sixMonths.map((x) => x.id));
  const inter = [...artistsA].filter((x) => artistsB.has(x));
  const union = new Set([...artistsA, ...artistsB]);
  const jaccard = union.size === 0 ? 0 : inter.length / union.size;

  const gA = new Map(a.genres.map((g) => [g.name, g.weight]));
  const gB = new Map(b.genres.map((g) => [g.name, g.weight]));
  const all = new Set([...gA.keys(), ...gB.keys()]);
  let dot = 0, normA = 0, normB = 0;
  for (const g of all) {
    const x = gA.get(g) ?? 0, y = gB.get(g) ?? 0;
    dot += x * y; normA += x * x; normB += y * y;
  }
  const cosine = normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;

  const compatibility = Math.round((0.5 * jaccard + 0.5 * cosine) * 100);

  const sharedArtists = a.topArtists.sixMonths.filter((x) => artistsB.has(x.id));
  const sharedGenres = a.genres
    .filter((g) => gB.has(g.name))
    .slice(0, 8)
    .map((g) => g.name);

  return { compatibility, sharedArtists, sharedGenres };
}
