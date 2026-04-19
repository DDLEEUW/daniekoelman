# 🎵 Spotify Friend Hub

A sleek, modern web app that connects Spotify and shows a live, Wrapped-style dashboard — plus friends, taste compatibility, and collaborative group playlists.

- **Personal dashboard**: top artists, top tracks, genre pie, listening heatmap, peak hours
- **Daily refresh**: cron job snapshots stats nightly; manual refresh anytime
- **Friends**: search app users, add them, compute taste compatibility
- **Groups**: create a group, merge everyone's top tracks, push a playlist to Spotify

**Stack:** Vite + React + TypeScript + Tailwind + Framer Motion + Recharts · Express + better-sqlite3 + node-cron.

---

## 1. Register a Spotify app (5 minutes)

1. Go to https://developer.spotify.com/dashboard and log in.
2. Click **Create app**.
   - **App name**: `Spotify Friend Hub` (anything)
   - **App description**: anything
   - **Redirect URI**: `http://127.0.0.1:4000/auth/callback`
     (Click **Add**. Must be this exact URI.)
   - **APIs used**: Web API
3. Agree to terms → **Save**.
4. Open your app → **Settings** → copy the **Client ID** and **Client secret**.

> Note: While your app is in **Development mode**, only users you've added under **User Management** can log in. Add yourself and any friends you want to test with.

---

## 2. Configure environment

```bash
cd spotify-friend-hub
cp .env.example .env
```

Edit `.env` and paste your credentials:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4000/auth/callback
SESSION_SECRET=<any long random string>
```

The server looks for `.env` in the repo root automatically, so no symlinking needed.

---

## 3. Install and run

```bash
npm install              # installs both workspaces
npm run dev:server       # terminal 1 — http://127.0.0.1:4000
npm run dev:client       # terminal 2 — http://127.0.0.1:5173
```

Open **http://127.0.0.1:5173** → click **Login with Spotify** → you'll land on your dashboard.

---

## 4. Architecture

```
spotify-friend-hub/
├── server/                  Express + SQLite
│   ├── src/
│   │   ├── index.ts         app entry, middleware, cron
│   │   ├── config.ts        env loading
│   │   ├── db/schema.ts     SQLite schema (users, snapshots, friendships, groups)
│   │   ├── lib/
│   │   │   ├── spotify.ts   OAuth + token refresh + API wrapper
│   │   │   ├── stats.ts     compute top-artists/tracks/genres/heatmap
│   │   │   ├── cron.ts      nightly snapshot job
│   │   │   └── session.ts   requireAuth middleware
│   │   └── routes/
│   │       ├── auth.ts      /auth/login, /auth/callback
│   │       ├── me.ts        /api/me, /stats, /now-playing, /history
│   │       ├── friends.ts   /api/friends (+ search, compare)
│   │       └── groups.ts    /api/groups (+ merged, sync-to-spotify)
└── client/                  Vite + React + Tailwind
    └── src/
        ├── pages/           Landing, Dashboard, Friends, Groups
        ├── components/      Layout, NowPlayingBadge, Card, GenreChart, Heatmap
        ├── hooks/useAuth.ts
        └── lib/api.ts       typed client
```

### How stats are computed

From the Spotify Web API, for each user we fetch:

- `/me/top/artists` (long, medium, short term)
- `/me/top/tracks` (long, medium, short term)
- `/me/player/recently-played` (last 50)
- `/me/player/currently-playing` (live)

Stats are aggregated server-side into a JSON "snapshot" and cached in SQLite. The dashboard reuses a snapshot if younger than 15 minutes (tap **Refresh now** to force). A cron job runs nightly at 03:17 to take a fresh snapshot for every registered user.

### How friends work

Spotify's public API does **not** expose a user's friends list. So friends here are other people who have signed into this app. Search by Spotify display name or user ID, click **Add**. Friendship is stored symmetrically and each side can see the other's latest snapshot.

Taste compatibility = 50% Jaccard over top artists + 50% cosine similarity over the genre-weight vectors, scaled to 0–100.

### How group playlists work

Create a group, pick friends. The merged playlist ranks tracks by **how many members have them in their top tracks** (voters first, then accumulated rank-weighted score). Click **Push to Spotify** to create (or re-sync) the playlist under your Spotify account.

---

## 5. Scripts

| command | what |
| --- | --- |
| `npm run dev:server` | start Express with hot reload (tsx watch) |
| `npm run dev:client` | start Vite dev server on 5173 with proxy to 4000 |
| `npm run build` | build both workspaces |
| `npm start` | run compiled server (`node dist/index.js`) |

---

## 6. Production notes

- Replace `SESSION_SECRET` with a strong random value (e.g. `openssl rand -hex 32`).
- Put the Express server behind HTTPS; set `cookie.secure: true` in `src/index.ts`.
- Register the production redirect URI in the Spotify dashboard and update `SPOTIFY_REDIRECT_URI`.
- Consider swapping `better-sqlite3` for Postgres once you have >100 users.
- To make the app available to non-whitelisted users, submit it for Spotify's **Extended Quota** review.

---

## 7. Phase 2 ideas (not yet built)

- Trend lines from historical snapshots (your top artist over time)
- "Discovery" — tracks your friends love that you haven't heard
- Collaborative add/remove from group playlist inside the app
- Share stats as an image (canvas render)
- Light theme toggle
