import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../lib/session.js";
import { db } from "../db/schema.js";
import { spotifyRequest } from "../lib/spotify.js";
import { computeMergedPlaylist } from "../lib/merged.js";

export const groupsRouter = Router();

type GroupRow = {
  id: string;
  name: string;
  owner_id: string;
  spotify_playlist_id: string | null;
  created_at: number;
};

groupsRouter.get("/", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const rows = db
    .prepare(
      `SELECT g.* FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ? ORDER BY g.created_at DESC`,
    )
    .all(me) as GroupRow[];
  res.json(rows);
});

groupsRouter.post("/", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const name = (req.body?.name as string | undefined)?.trim();
  const memberIds = (req.body?.memberIds as string[] | undefined) ?? [];
  if (!name) return res.status(400).json({ error: "name required" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO groups (id, name, owner_id) VALUES (?, ?, ?)").run(id, name, me);
  const memberStmt = db.prepare(
    "INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)",
  );
  memberStmt.run(id, me);
  for (const uid of memberIds) memberStmt.run(id, uid);
  res.json({ id, name });
});

groupsRouter.get("/:id", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const groupId = req.params.id;
  const isMember = db
    .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, me);
  if (!isMember) return res.status(403).json({ error: "Not a member" });
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as
    | GroupRow
    | undefined;
  if (!group) return res.status(404).json({ error: "Not found" });
  const members = db
    .prepare(
      `SELECT u.id, u.display_name, u.avatar_url
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ?`,
    )
    .all(groupId);
  res.json({ ...group, members });
});

groupsRouter.post("/:id/members", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const groupId = req.params.id;
  const group = db.prepare("SELECT owner_id FROM groups WHERE id = ?").get(groupId) as
    | { owner_id: string }
    | undefined;
  if (!group) return res.status(404).json({ error: "Not found" });
  if (group.owner_id !== me) return res.status(403).json({ error: "Only owner can add" });
  const userId = req.body?.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId required" });
  db.prepare(
    "INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)",
  ).run(groupId, userId);
  res.json({ ok: true });
});

groupsRouter.get("/:id/merged", requireAuth, (req, res) => {
  const me = req.session.userId!;
  const groupId = req.params.id;
  const isMember = db
    .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, me);
  if (!isMember) return res.status(403).json({ error: "Not a member" });
  res.json(computeMergedPlaylist(groupId));
});

groupsRouter.post("/:id/sync-to-spotify", requireAuth, async (req, res) => {
  const me = req.session.userId!;
  const groupId = req.params.id;
  try {
    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as
      | GroupRow
      | undefined;
    if (!group) return res.status(404).json({ error: "Not found" });
    const isMember = db
      .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?")
      .get(groupId, me);
    if (!isMember) return res.status(403).json({ error: "Not a member" });

    const merged = computeMergedPlaylist(groupId);
    const uris = merged.tracks.map((t) => `spotify:track:${t.id}`);

    let playlistId = group.spotify_playlist_id;
    if (!playlistId) {
      const playlist = await spotifyRequest<{ id: string }>(me, "POST", `/users/${me}/playlists`, {
        name: `🎵 ${group.name}`,
        description: "Group playlist from Spotify Friend Hub",
        public: false,
      });
      playlistId = playlist.id;
      db.prepare("UPDATE groups SET spotify_playlist_id = ? WHERE id = ?").run(
        playlistId,
        groupId,
      );
    }
    await spotifyRequest(me, "PUT", `/playlists/${playlistId}/tracks`, {
      uris: uris.slice(0, 100),
    });
    res.json({ ok: true, playlistId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "sync failed" });
  }
});
