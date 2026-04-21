import express from "express";
import session from "express-session";
import SqliteStoreFactory from "better-sqlite3-session-store";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { db } from "./db/schema.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { friendsRouter } from "./routes/friends.js";
import { groupsRouter } from "./routes/groups.js";
import { startDailySnapshotJob } from "./lib/cron.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

// On Render (and most PaaS), Express sits behind a TLS-terminating proxy. This
// lets `secure` cookies and req.ip work correctly.
if (isProd) app.set("trust proxy", 1);

// CORS is only relevant when the client runs on a different origin (local dev).
// In prod we serve the static client from this same server, so CORS is a no-op.
if (!isProd) {
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );
}

app.use(express.json());
app.use(cookieParser());

const SqliteStore = SqliteStoreFactory(session);
app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: { clear: true, intervalMs: 1000 * 60 * 60 * 24 },
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/groups", groupsRouter);

// In production, serve the built client bundle and fall back to index.html for
// client-side routing (everything that isn't /api or /auth).
if (isProd) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/(api|auth|health)).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    console.warn(`⚠️  client/dist not found at ${clientDist} — did you run the client build?`);
  }
}

startDailySnapshotJob();

app.listen(config.port, () => {
  console.log(`🎵 Server listening on port ${config.port}`);
});
