import { config } from "../config.js";
import { db, type UserRow } from "../db/schema.js";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.spotify.clientId,
    scope: config.spotify.scopes,
    redirect_uri: config.spotify.redirectUri,
    state,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.spotify.redirectUri,
  });
  const basic = Buffer.from(
    `${config.spotify.clientId}:${config.spotify.clientSecret}`,
  ).toString("base64");
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const basic = Buffer.from(
    `${config.spotify.clientId}:${config.spotify.clientSecret}`,
  ).toString("base64");
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

/** Returns a valid access token, refreshing it if it's close to expiring. */
export async function getValidAccessToken(userId: string): Promise<string> {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
  if (!user) throw new Error("User not found");

  const now = Date.now();
  if (user.token_expires_at - 60_000 > now) return user.access_token;

  const refreshed = await refreshAccessToken(user.refresh_token);
  const newExpiry = now + refreshed.expires_in * 1000;
  db.prepare(
    `UPDATE users SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
     token_expires_at = ?, updated_at = ? WHERE id = ?`,
  ).run(
    refreshed.access_token,
    refreshed.refresh_token ?? null,
    newExpiry,
    now,
    userId,
  );
  return refreshed.access_token;
}

/** Authenticated GET against Spotify API. */
export async function spotifyGet<T>(userId: string, path: string): Promise<T> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null as T;
  if (!res.ok) throw new Error(`Spotify GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function spotifyRequest<T>(
  userId: string,
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null as T;
  if (!res.ok) throw new Error(`Spotify ${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
