import { spotifyGet } from "./spotify.js";

type SpotifyImage = { url: string };
type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  popularity: number;
};
type SpotifyAlbum = {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
};
type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  album: SpotifyAlbum;
  artists: { id: string; name: string }[];
  popularity: number;
};
type Paged<T> = { items: T[]; total: number };
type RecentItem = { track: SpotifyTrack; played_at: string };

export type StatsPayload = {
  profile: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  topArtists: {
    allTime: SpotifyArtist[];
    sixMonths: SpotifyArtist[];
    fourWeeks: SpotifyArtist[];
  };
  topTracks: {
    allTime: SpotifyTrack[];
    sixMonths: SpotifyTrack[];
    fourWeeks: SpotifyTrack[];
  };
  genres: { name: string; weight: number; pct: number }[];
  recentlyPlayed: RecentItem[];
  listening: {
    totalMinutesRecent: number;       // sum of recently-played tracks duration
    hourHistogram: number[];          // 24-length
    weekdayHistogram: number[];       // 7-length (Sun=0)
    heatmap: number[][];              // [weekday][hour]
    mostActiveHour: number;
    topArtistShare: number;           // pct of recent plays by top artist
  };
  generatedAt: number;
};

export async function computeStats(userId: string): Promise<StatsPayload> {
  const [
    profile,
    topArtistsLong,
    topArtistsMed,
    topArtistsShort,
    topTracksLong,
    topTracksMed,
    topTracksShort,
    recents,
  ] = await Promise.all([
    spotifyGet<{
      id: string;
      display_name: string | null;
      images: SpotifyImage[];
    }>(userId, "/me"),
    spotifyGet<Paged<SpotifyArtist>>(userId, "/me/top/artists?limit=20&time_range=long_term"),
    spotifyGet<Paged<SpotifyArtist>>(userId, "/me/top/artists?limit=20&time_range=medium_term"),
    spotifyGet<Paged<SpotifyArtist>>(userId, "/me/top/artists?limit=20&time_range=short_term"),
    spotifyGet<Paged<SpotifyTrack>>(userId, "/me/top/tracks?limit=20&time_range=long_term"),
    spotifyGet<Paged<SpotifyTrack>>(userId, "/me/top/tracks?limit=20&time_range=medium_term"),
    spotifyGet<Paged<SpotifyTrack>>(userId, "/me/top/tracks?limit=20&time_range=short_term"),
    spotifyGet<Paged<RecentItem>>(userId, "/me/player/recently-played?limit=50"),
  ]);

  // Genre aggregation (weighted by artist rank across all time ranges)
  const genreMap = new Map<string, number>();
  const rankWeight = (idx: number) => Math.max(0.1, 1 - idx * 0.04);
  for (const list of [topArtistsLong.items, topArtistsMed.items, topArtistsShort.items]) {
    list.forEach((a, i) => {
      for (const g of a.genres ?? []) {
        genreMap.set(g, (genreMap.get(g) ?? 0) + rankWeight(i));
      }
    });
  }
  const genreTotal = Array.from(genreMap.values()).reduce((s, v) => s + v, 0) || 1;
  const genres = Array.from(genreMap.entries())
    .map(([name, weight]) => ({ name, weight, pct: (weight / genreTotal) * 100 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12);

  // Listening heatmap from recently played (up to 50)
  const hourHistogram = new Array<number>(24).fill(0);
  const weekdayHistogram = new Array<number>(7).fill(0);
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let totalMs = 0;
  const artistPlayCount = new Map<string, number>();
  for (const r of recents.items) {
    const d = new Date(r.played_at);
    hourHistogram[d.getHours()]++;
    weekdayHistogram[d.getDay()]++;
    heatmap[d.getDay()][d.getHours()]++;
    totalMs += r.track.duration_ms;
    for (const a of r.track.artists) {
      artistPlayCount.set(a.name, (artistPlayCount.get(a.name) ?? 0) + 1);
    }
  }
  const maxHourCount = Math.max(...hourHistogram);
  const mostActiveHour = maxHourCount > 0 ? hourHistogram.indexOf(maxHourCount) : -1;
  const topArtistCount = Math.max(0, ...artistPlayCount.values());
  const totalPlays = recents.items.length || 1;
  const topArtistShare = (topArtistCount / totalPlays) * 100;

  return {
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.images?.[0]?.url ?? null,
    },
    topArtists: {
      allTime: topArtistsLong.items,
      sixMonths: topArtistsMed.items,
      fourWeeks: topArtistsShort.items,
    },
    topTracks: {
      allTime: topTracksLong.items,
      sixMonths: topTracksMed.items,
      fourWeeks: topTracksShort.items,
    },
    genres,
    recentlyPlayed: recents.items,
    listening: {
      totalMinutesRecent: Math.round(totalMs / 60000),
      hourHistogram,
      weekdayHistogram,
      heatmap,
      mostActiveHour,
      topArtistShare,
    },
    generatedAt: Date.now(),
  };
}
