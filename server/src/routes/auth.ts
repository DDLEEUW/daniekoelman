import { Router } from "express";
import crypto from "node:crypto";
import { config } from "../config.js";
import { buildAuthUrl, exchangeCodeForTokens } from "../lib/spotify.js";
import { db } from "../db/schema.js";

export const authRouter = Router();

authRouter.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;
  res.redirect(buildAuthUrl(state));
});

authRouter.get("/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (error) return res.redirect(`${config.clientOrigin}/?error=${encodeURIComponent(error)}`);
  if (!code || !state || state !== req.session.oauthState) {
    return res.status(400).send("Invalid state or missing code");
  }
  req.session.oauthState = undefined;

  try {
    const tokens = await exchangeCodeForTokens(code);

    // fetch profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
    const profile = (await profileRes.json()) as {
      id: string;
      display_name: string | null;
      email: string | null;
      images: { url: string }[];
    };

    const now = Date.now();
    const expiresAt = now + tokens.expires_in * 1000;

    db.prepare(
      `INSERT INTO users (id, display_name, email, avatar_url, access_token, refresh_token, token_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         email = excluded.email,
         avatar_url = excluded.avatar_url,
         access_token = excluded.access_token,
         refresh_token = COALESCE(excluded.refresh_token, users.refresh_token),
         token_expires_at = excluded.token_expires_at,
         updated_at = excluded.updated_at`,
    ).run(
      profile.id,
      profile.display_name,
      profile.email,
      profile.images?.[0]?.url ?? null,
      tokens.access_token,
      tokens.refresh_token ?? "",
      expiresAt,
      now,
      now,
    );

    req.session.userId = profile.id;
    res.redirect(`${config.clientOrigin}/dashboard`);
  } catch (err) {
    console.error(err);
    res.redirect(`${config.clientOrigin}/?error=auth_failed`);
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});
