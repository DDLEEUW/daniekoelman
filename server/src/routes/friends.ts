import { Router } from "express";
import { requireAuth } from "../lib/session.js";
import { db } from "../db/schema.js";
import { compareTaste } from "../lib/compare.js";

export const friendsRouter = Router();

type UserLite = { id: string; display_name: string | null; avatar_url: string | null };

friendsRouter.get("/", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const rows = db
    .prepare(
      `SELECT u.id, u.display_name, u.avatar_url, f.status
       FROM friendships f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?`,
    )
    .all(me) as (UserLite & { status: string })[];
  res.json(rows);
});

friendsRouter.get("/search", requireAuth, (req, res) => {
  const q = (req.query.q as string | undefined)?.trim() ?? "";
  if (!q) return res.json([]);
  const rows = db
    .prepare(
      `SELECT id, display_name, avatar_url FROM users
       WHERE id != ? AND (id LIKE ? OR display_name LIKE ?) LIMIT 20`,
    )
    .all(req.session.userId, `%${q}%`, `%${q}%`) as UserLite[];
  res.json(rows);
});

/** Accept an invite link: `${inviterId}` is the Spotify user id of the person who shared their link. */
friendsRouter.post("/invite/:inviterId/accept", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const inviterId = req.params.inviterId;
  if (inviterId === me) return res.status(400).json({ error: "That's your own invite link" });
  const inviter = db.prepare("SELECT id, display_name, avatar_url FROM users WHERE id = ?").get(inviterId);
  if (!inviter) return res.status(404).json({ error: "Inviter not found" });
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')",
  );
  stmt.run(me, inviterId);
  stmt.run(inviterId, me);
  res.json({ ok: true, inviter });
});

friendsRouter.post("/:friendId", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const friendId = req.params.friendId;
  if (friendId === me) return res.status(400).json({ error: "Cannot add yourself" });
  const friend = db.prepare("SELECT id FROM users WHERE id = ?").get(friendId);
  if (!friend) return res.status(404).json({ error: "User not found" });
  // symmetric friendship
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')",
  );
  stmt.run(me, friendId);
  stmt.run(friendId, me);
  res.json({ ok: true });
});

friendsRouter.delete("/:friendId", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const friendId = req.params.friendId;
  const stmt = db.prepare("DELETE FROM friendships WHERE user_id = ? AND friend_id = ?");
  stmt.run(me, friendId);
  stmt.run(friendId, me);
  res.json({ ok: true });
});

friendsRouter.get("/:friendId/profile", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const friendId = req.params.friendId;
  const rel = db
    .prepare("SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?")
    .get(me, friendId);
  if (!rel) return res.status(403).json({ error: "Not friends" });
  const user = db
    .prepare("SELECT id, display_name, avatar_url FROM users WHERE id = ?")
    .get(friendId) as UserLite | undefined;
  const snap = db
    .prepare(
      "SELECT payload FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1",
    )
    .get(friendId) as { payload: string } | undefined;
  if (!user) return res.status(404).json({ error: "Friend not found" });
  res.json({ user, stats: snap ? JSON.parse(snap.payload) : null });
});

/** Discovery: top tracks my friends love that aren't in my top tracks. */
friendsRouter.get("/discover", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const mySnap = db
    .prepare("SELECT payload FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1")
    .get(me) as { payload: string } | undefined;
  if (!mySnap) return res.json([]);
  const mine = JSON.parse(mySnap.payload);
  const myTrackIds = new Set<string>([
    ...mine.topTracks.allTime.map((t: { id: string }) => t.id),
    ...mine.topTracks.sixMonths.map((t: { id: string }) => t.id),
    ...mine.topTracks.fourWeeks.map((t: { id: string }) => t.id),
  ]);

  const friends = db
    .prepare(
      `SELECT u.id, u.display_name, u.avatar_url
       FROM friendships f JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?`,
    )
    .all(me) as { id: string; display_name: string | null; avatar_url: string | null }[];

  type TrackLite = {
    id: string;
    name: string;
    album: { name: string; images: { url: string }[] };
    artists: { name: string }[];
  };
  type Recommendation = {
    track: TrackLite;
    fans: { id: string; display_name: string | null; avatar_url: string | null }[];
    score: number;
  };
  const recs = new Map<string, Recommendation>();

  for (const f of friends) {
    const snap = db
      .prepare("SELECT payload FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1")
      .get(f.id) as { payload: string } | undefined;
    if (!snap) continue;
    const p = JSON.parse(snap.payload);
    const friendTracks: TrackLite[] = [
      ...(p.topTracks.fourWeeks ?? []),
      ...(p.topTracks.sixMonths ?? []),
    ];
    friendTracks.forEach((t, i) => {
      if (myTrackIds.has(t.id)) return;
      const weight = Math.max(0.1, 1 - i * 0.04);
      const entry = recs.get(t.id) ?? { track: t, fans: [], score: 0 };
      if (!entry.fans.some((x) => x.id === f.id)) entry.fans.push(f);
      entry.score += weight;
      recs.set(t.id, entry);
    });
  }

  const list = [...recs.values()]
    .sort((a, b) => b.fans.length - a.fans.length || b.score - a.score)
    .slice(0, 30);
  res.json(list);
});

/** Taste compatibility (Jaccard over top artists + genre cosine) */
friendsRouter.get("/:friendId/compare", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const friendId = req.params.friendId;
  const rel = db
    .prepare("SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?")
    .get(me, friendId);
  if (!rel) return res.status(403).json({ error: "Not friends" });

  const get = (uid: string) => {
    const row = db
      .prepare("SELECT payload FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1")
      .get(uid) as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) : null;
  };
  res.json(compareTaste(get(me), get(friendId)));
});
