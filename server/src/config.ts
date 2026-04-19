import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Try, in order: ./.env (cwd), ../.env (monorepo root), alongside this file's parent
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", "..", ".env"),
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}. See .env.example at the repo root.`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  // In production we serve the client from the same origin, so post-login
  // redirects should be relative.
  clientOrigin: process.env.CLIENT_ORIGIN ?? (isProd ? "" : "http://127.0.0.1:5173"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-insecure-secret",
  spotify: {
    clientId: required("SPOTIFY_CLIENT_ID"),
    clientSecret: required("SPOTIFY_CLIENT_SECRET"),
    redirectUri: required("SPOTIFY_REDIRECT_URI"),
    scopes: [
      "user-read-private",
      "user-read-email",
      "user-top-read",
      "user-read-recently-played",
      "user-read-currently-playing",
      "user-read-playback-state",
      "user-library-read",
      "playlist-read-private",
      "playlist-modify-private",
      "playlist-modify-public",
    ].join(" "),
  },
  dbPath: process.env.DATABASE_PATH ?? "./data.db",
};
