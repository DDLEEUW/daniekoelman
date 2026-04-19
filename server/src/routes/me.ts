import { Router } from "express";
import { requireAuth } from "../lib/session.js";
import { db, type UserRow } from "../db/schema.js";
import { computeStats } from "../lib/stats.js";
import { spotifyGet } from "../lib/spotify.js";
import { listeningSummary, recentPlays, recordRecentPlays, trackPersonalStats } from "../lib/listening.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, display_name, email, avatar_url FROM users WHERE id = ?")
    .get(req.session.userId!) as Pick<UserRow, "id" | "display_name" | "email" | "avatar_url"> | undefined;
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

meRouter.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const latest = db
      .prepare(
        "SELECT payload, captured_at FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1",
      )
      .get(userId) as { payload: string; captured_at: number } | undefined;

    // Reuse if < 15 min old, unless ?refresh=1
    const force = req.query.refresh === "1";
    if (!force && latest && Date.now() - latest.captured_at < 15 * 60 * 1000) {
      return res.json(JSON.parse(latest.payload));
    }

    const stats = await computeStats(userId);
    db.prepare("INSERT INTO snapshots (user_id, captured_at, payload) VALUES (?, ?, ?)").run(
      userId,
      stats.generatedAt,
      JSON.stringify(stats),
    );
    // Persist recently-played entries (dedup on played_at) so listening totals accumulate.
    recordRecentPlays(userId, stats.recentlyPlayed);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

meRouter.get("/now-playing", requireAuth, async (req, res) => {
  try {
    const playing = await spotifyGet<{
      is_playing: boolean;
      item: {
        id: string;
        name: string;
        duration_ms: number;
        album: { name: string; images: { url: string }[] };
        artists: { name: string }[];
      } | null;
      progress_ms: number | null;
    } | null>(req.session.userId!, "/me/player/currently-playing");
    res.json(playing ?? { is_playing: false, item: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch now playing" });
  }
});

meRouter.get("/listening-summary", requireAuth, (req, res) => {
  res.json(listeningSummary(req.session.userId!));
});

meRouter.get("/recent-plays", requireAuth, (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "10"), 10) || 10, 1), 50);
  res.json(recentPlays(req.session.userId!, limit));
});

meRouter.get("/track/:trackId", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const trackId = req.params.trackId;
    const track = await spotifyGet<{
      id: string;
      name: string;
      duration_ms: number;
      popularity: number;
      preview_url: string | null;
      explicit: boolean;
      external_urls: { spotify: string };
      album: {
        id: string;
        name: string;
        release_date: string;
        images: { url: string }[];
      };
      artists: { id: string; name: string }[];
    }>(userId, `/tracks/${encodeURIComponent(trackId)}`);

    // Rank in latest snapshot
    const snap = db
      .prepare(
        "SELECT payload FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1",
      )
      .get(userId) as { payload: string } | undefined;
    const ranks: { range: "fourWeeks" | "sixMonths" | "allTime"; rank: number }[] = [];
    if (snap) {
      const p = JSON.parse(snap.payload);
      for (const range of ["fourWeeks", "sixMonths", "allTime"] as const) {
        const idx = (p.topTracks?.[range] ?? []).findIndex(
          (t: { id: string }) => t.id === trackId,
        );
        if (idx >= 0) ranks.push({ range, rank: idx + 1 });
      }
    }

    res.json({ track, personal: trackPersonalStats(userId, trackId), ranks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch track" });
  }
});

meRouter.get("/history", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT captured_at, payload FROM snapshots WHERE user_id = ?
       ORDER BY captured_at DESC LIMIT 30`,
    )
    .all(req.session.userId!) as { captured_at: number; payload: string }[];
  res.json(
    rows.map((r) => {
      const p = JSON.parse(r.payload);
      return {
        capturedAt: r.captured_at,
        topArtist: p.topArtists?.fourWeeks?.[0]?.name ?? null,
        minutesRecent: p.listening?.totalMinutesRecent ?? 0,
        topGenre: p.genres?.[0]?.name ?? null,
      };
    }),
  );
});
