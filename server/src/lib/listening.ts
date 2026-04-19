import { db } from "../db/schema.js";

type RecentItem = {
  played_at: string;
  track: {
    id: string;
    name: string;
    duration_ms: number;
    album: { name: string; images: { url: string }[] };
    artists: { name: string }[];
  };
};

/**
 * Persist recently-played entries (dedup on played_at timestamp).
 * Spotify only exposes the last ~50 plays, so we call this whenever we fetch
 * /me/player/recently-played and unique new entries accumulate over time.
 */
export function recordRecentPlays(userId: string, items: RecentItem[]) {
  if (!items.length) return;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO played_tracks
     (user_id, played_at, track_id, track_name, artist_name, album_name, album_art, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows: RecentItem[]) => {
    for (const r of rows) {
      const ts = new Date(r.played_at).getTime();
      if (!Number.isFinite(ts)) continue;
      insert.run(
        userId,
        ts,
        r.track.id,
        r.track.name,
        r.track.artists.map((a) => a.name).join(", "),
        r.track.album.name,
        r.track.album.images?.[0]?.url ?? null,
        r.track.duration_ms,
      );
    }
  });
  tx(items);
}

export type ListeningSummary = {
  trackedSince: number | null;       // unix ms of oldest recorded play
  totalMinutes: number;
  totalPlays: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  thisYearMinutes: number;
  perYear: { year: number; minutes: number; plays: number }[];
  topByPlays: { trackId: string; name: string; artist: string; albumArt: string | null; plays: number }[];
};

export function listeningSummary(userId: string): ListeningSummary {
  const now = new Date();
  const startOfWeek = (() => {
    const d = new Date(now);
    const day = d.getDay(); // 0=Sun
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  })();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const totalsRow = db
    .prepare(
      `SELECT MIN(played_at) AS first, COUNT(*) AS plays, COALESCE(SUM(duration_ms),0) AS ms
       FROM played_tracks WHERE user_id = ?`,
    )
    .get(userId) as { first: number | null; plays: number; ms: number };

  const sumSince = (since: number) =>
    (db
      .prepare(
        `SELECT COALESCE(SUM(duration_ms),0) AS ms FROM played_tracks
         WHERE user_id = ? AND played_at >= ?`,
      )
      .get(userId, since) as { ms: number }).ms;

  const perYearRows = db
    .prepare(
      `SELECT CAST(strftime('%Y', played_at/1000, 'unixepoch') AS INTEGER) AS year,
              COALESCE(SUM(duration_ms),0) AS ms,
              COUNT(*) AS plays
       FROM played_tracks WHERE user_id = ?
       GROUP BY year ORDER BY year DESC`,
    )
    .all(userId) as { year: number; ms: number; plays: number }[];

  const topRows = db
    .prepare(
      `SELECT track_id, track_name, artist_name, album_art, COUNT(*) AS plays
       FROM played_tracks WHERE user_id = ?
       GROUP BY track_id
       ORDER BY plays DESC, MAX(played_at) DESC
       LIMIT 10`,
    )
    .all(userId) as {
    track_id: string;
    track_name: string | null;
    artist_name: string | null;
    album_art: string | null;
    plays: number;
  }[];

  return {
    trackedSince: totalsRow.first,
    totalMinutes: Math.round(totalsRow.ms / 60000),
    totalPlays: totalsRow.plays,
    thisWeekMinutes: Math.round(sumSince(startOfWeek) / 60000),
    thisMonthMinutes: Math.round(sumSince(startOfMonth) / 60000),
    thisYearMinutes: Math.round(sumSince(startOfYear) / 60000),
    perYear: perYearRows.map((r) => ({
      year: r.year,
      minutes: Math.round(r.ms / 60000),
      plays: r.plays,
    })),
    topByPlays: topRows.map((r) => ({
      trackId: r.track_id,
      name: r.track_name ?? "(unknown)",
      artist: r.artist_name ?? "",
      albumArt: r.album_art,
      plays: r.plays,
    })),
  };
}

/** Latest N plays (newest first) from the persisted history. */
export function recentPlays(userId: string, limit = 10) {
  const rows = db
    .prepare(
      `SELECT played_at, track_id, track_name, artist_name, album_name, album_art, duration_ms
       FROM played_tracks WHERE user_id = ?
       ORDER BY played_at DESC
       LIMIT ?`,
    )
    .all(userId, limit) as {
    played_at: number;
    track_id: string;
    track_name: string | null;
    artist_name: string | null;
    album_name: string | null;
    album_art: string | null;
    duration_ms: number;
  }[];
  return rows.map((r) => ({
    playedAt: r.played_at,
    trackId: r.track_id,
    name: r.track_name ?? "(unknown)",
    artist: r.artist_name ?? "",
    album: r.album_name ?? "",
    albumArt: r.album_art,
    durationMs: r.duration_ms,
  }));
}

/** Per-track personal stats used by the track detail modal. */
export function trackPersonalStats(userId: string, trackId: string) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS plays, MIN(played_at) AS first, MAX(played_at) AS last,
              COALESCE(SUM(duration_ms),0) AS ms
       FROM played_tracks WHERE user_id = ? AND track_id = ?`,
    )
    .get(userId, trackId) as { plays: number; first: number | null; last: number | null; ms: number };
  return {
    plays: row.plays,
    firstPlayedAt: row.first,
    lastPlayedAt: row.last,
    totalMinutes: Math.round(row.ms / 60000),
  };
}
