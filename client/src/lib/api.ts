async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 401) {
    // Session expired or invalid. Only redirect if we're not already on the landing page
    // and not calling the initial /api/me probe.
    const probing = path === "/api/me";
    if (!probing && window.location.pathname !== "/") {
      window.location.href = "/?error=session_expired";
    }
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<{ id: string; display_name: string | null; email: string | null; avatar_url: string | null }>("/api/me"),
  stats: (refresh = false) => request<Stats>(`/api/me/stats${refresh ? "?refresh=1" : ""}`),
  nowPlaying: () => request<NowPlaying>("/api/me/now-playing"),
  history: () => request<HistoryEntry[]>("/api/me/history"),
  listeningSummary: () => request<ListeningSummary>("/api/me/listening-summary"),
  recentPlays: (limit = 10) => request<RecentPlay[]>(`/api/me/recent-plays?limit=${limit}`),
  track: (trackId: string) => request<TrackDetail>(`/api/me/track/${encodeURIComponent(trackId)}`),
  acceptInvite: (inviterId: string) =>
    request<{ ok: true; inviter: FriendLite }>(`/api/friends/invite/${encodeURIComponent(inviterId)}/accept`, {
      method: "POST",
    }),
  friends: () => request<FriendLite[]>("/api/friends"),
  searchUsers: (q: string) => request<FriendLite[]>(`/api/friends/search?q=${encodeURIComponent(q)}`),
  addFriend: (id: string) => request<{ ok: true }>(`/api/friends/${id}`, { method: "POST" }),
  removeFriend: (id: string) => request<{ ok: true }>(`/api/friends/${id}`, { method: "DELETE" }),
  friendProfile: (id: string) => request<{ user: FriendLite; stats: Stats | null }>(`/api/friends/${id}/profile`),
  compare: (id: string) => request<Compare>(`/api/friends/${id}/compare`),
  discover: () => request<DiscoveryItem[]>("/api/friends/discover"),
  groups: () => request<Group[]>("/api/groups"),
  createGroup: (name: string, memberIds: string[]) =>
    request<{ id: string; name: string }>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    }),
  group: (id: string) => request<GroupDetail>(`/api/groups/${id}`),
  addGroupMember: (id: string, userId: string) =>
    request<{ ok: true }>(`/api/groups/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  mergedPlaylist: (id: string) => request<MergedPlaylist>(`/api/groups/${id}/merged`),
  syncToSpotify: (id: string) =>
    request<{ ok: true; playlistId: string }>(`/api/groups/${id}/sync-to-spotify`, { method: "POST" }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
};

export type FriendLite = { id: string; display_name: string | null; avatar_url: string | null; status?: string };
export type SpotifyImage = { url: string };
export type Artist = { id: string; name: string; images: SpotifyImage[]; genres: string[] };
export type Track = {
  id: string;
  name: string;
  duration_ms: number;
  album: { name: string; images: SpotifyImage[] };
  artists: { id?: string; name: string }[];
};
export type Stats = {
  profile: { id: string; displayName: string | null; avatarUrl: string | null };
  topArtists: { allTime: Artist[]; sixMonths: Artist[]; fourWeeks: Artist[] };
  topTracks: { allTime: Track[]; sixMonths: Track[]; fourWeeks: Track[] };
  genres: { name: string; weight: number; pct: number }[];
  recentlyPlayed: { track: Track; played_at: string }[];
  listening: {
    totalMinutesRecent: number;
    hourHistogram: number[];
    weekdayHistogram: number[];
    heatmap: number[][];
    mostActiveHour: number;
    topArtistShare: number;
  };
  generatedAt: number;
};
export type NowPlaying = {
  is_playing: boolean;
  item: {
    id: string;
    name: string;
    duration_ms: number;
    album: { name: string; images: SpotifyImage[] };
    artists: { name: string }[];
  } | null;
  progress_ms?: number | null;
};
export type HistoryEntry = {
  capturedAt: number;
  topArtist: string | null;
  minutesRecent: number;
  topGenre: string | null;
};
export type Compare = {
  compatibility: number | null;
  sharedArtists: Artist[];
  sharedGenres: string[];
};
export type DiscoveryItem = {
  track: Track;
  fans: FriendLite[];
  score: number;
};
export type Group = {
  id: string;
  name: string;
  owner_id: string;
  spotify_playlist_id: string | null;
  created_at: number;
};
export type GroupDetail = Group & { members: FriendLite[] };
export type MergedPlaylist = {
  memberCount: number;
  tracks: (Track & { score: number; voters: number })[];
};
export type ListeningSummary = {
  trackedSince: number | null;
  totalMinutes: number;
  totalPlays: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  thisYearMinutes: number;
  perYear: { year: number; minutes: number; plays: number }[];
  topByPlays: { trackId: string; name: string; artist: string; albumArt: string | null; plays: number }[];
};
export type RecentPlay = {
  playedAt: number;
  trackId: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};
export type TrackDetail = {
  track: {
    id: string;
    name: string;
    duration_ms: number;
    popularity: number;
    preview_url: string | null;
    explicit: boolean;
    external_urls: { spotify: string };
    album: { id: string; name: string; release_date: string; images: SpotifyImage[] };
    artists: { id: string; name: string }[];
  };
  personal: {
    plays: number;
    firstPlayedAt: number | null;
    lastPlayedAt: number | null;
    totalMinutes: number;
  };
  ranks: { range: "fourWeeks" | "sixMonths" | "allTime"; rank: number }[];
};
