import Database from "better-sqlite3";
import { config } from "../config.js";

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                 -- spotify user id
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at INTEGER NOT NULL,   -- unix ms
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
    updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    payload TEXT NOT NULL,               -- JSON blob of top artists/tracks/genres/etc.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON snapshots(user_id, captured_at);

  CREATE TABLE IF NOT EXISTS friendships (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted',  -- pending | accepted
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    spotify_playlist_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS played_tracks (
    user_id TEXT NOT NULL,
    played_at INTEGER NOT NULL,           -- unix ms
    track_id TEXT NOT NULL,
    track_name TEXT,
    artist_name TEXT,
    album_name TEXT,
    album_art TEXT,
    duration_ms INTEGER NOT NULL,
    PRIMARY KEY (user_id, played_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_played_user_time ON played_tracks(user_id, played_at);
  CREATE INDEX IF NOT EXISTS idx_played_user_track ON played_tracks(user_id, track_id);
`);

export type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
  created_at: number;
  updated_at: number;
};
