import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  api,
  type FriendLite,
  type Compare,
  type DiscoveryItem,
  type Stats,
} from "../lib/api";
import { Card, CardTitle } from "../components/Card";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { TrackModal } from "../components/TrackModal";

type Tab = "friends" | "discover";

export default function Friends() {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendLite[]>([]);
  const [selected, setSelected] = useState<FriendLite | null>(null);
  const [compare, setCompare] = useState<Compare | null>(null);
  const [profileStats, setProfileStats] = useState<Stats | null>(null);
  const [discover, setDiscover] = useState<DiscoveryItem[] | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const toast = useToast();
  const { me } = useAuth();
  const inviteUrl = me ? `${window.location.origin}/invite/${me.id}` : "";

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast("Invite link copied 🔗");
    } catch {
      toast("Couldn't copy — select the link to copy manually");
    }
  }

  async function load() {
    setFriends(await api.friends());
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab !== "discover" || discover !== null) return;
    api.discover().then(setDiscover).catch(() => setDiscover([]));
  }, [tab, discover]);

  useEffect(() => {
    if (!query.trim()) return setResults([]);
    const id = setTimeout(async () => {
      try {
        setResults(await api.searchUsers(query));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  async function add(id: string) {
    await api.addFriend(id);
    setQuery("");
    setResults([]);
    await load();
    setDiscover(null);
    toast("Friend added 🎉");
  }

  async function remove(id: string) {
    await api.removeFriend(id);
    if (selected?.id === id) setSelected(null);
    await load();
    setDiscover(null);
    toast("Friend removed");
  }

  async function openFriend(f: FriendLite) {
    setSelected(f);
    setCompare(null);
    setProfileStats(null);
    try {
      const [cmp, prof] = await Promise.all([
        api.compare(f.id),
        api.friendProfile(f.id).then((p) => p.stats),
      ]);
      setCompare(cmp);
      setProfileStats(prof);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Friends</h1>
          <p className="text-muted text-sm">
            Share your invite link, or search for someone who's already on Music Buddies.
          </p>
        </div>
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
          {(
            [
              ["friends", "Friends"],
              ["discover", "Discover"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                tab === k ? "bg-accent text-white font-semibold" : "text-muted hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "friends" ? (
        <>
          <Card>
            <CardTitle hint="They just need to open this link and log in with Spotify">
              Invite a friend
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 outline-none font-mono text-sm"
              />
              <button onClick={copyInvite} className="btn-primary">Copy link</button>
            </div>
            <p className="text-xs text-muted mt-2">
              Spotify doesn't expose your real friends list — sharing this link is how you connect accounts here.
            </p>
          </Card>

          <Card>
            <CardTitle>Find people</CardTitle>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or Spotify ID…"
              className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-3 outline-none focus:border-accent/60"
            />
            {results.length > 0 && (
              <ul className="mt-3 space-y-2">
                {results.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                  >
                    {u.avatar_url && (
                      <img src={u.avatar_url} className="w-9 h-9 rounded-full" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{u.display_name ?? u.id}</div>
                      <div className="text-xs text-muted">{u.id}</div>
                    </div>
                    <button onClick={() => add(u.id)} className="btn-ghost">Add</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardTitle hint={`${friends.length}`}>Your friends</CardTitle>
              {friends.length === 0 ? (
                <div className="text-sm text-muted">No friends yet. Search above to add.</div>
              ) : (
                <ul className="space-y-2">
                  {friends.map((f) => (
                    <motion.li
                      key={f.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                        selected?.id === f.id ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                      onClick={() => openFriend(f)}
                    >
                      {f.avatar_url && (
                        <img src={f.avatar_url} className="w-9 h-9 rounded-full" alt="" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{f.display_name ?? f.id}</div>
                        <div className="text-xs text-muted">{f.id}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(f.id);
                        }}
                        className="text-xs text-muted hover:text-red-400"
                      >
                        Remove
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle>Compatibility</CardTitle>
              {!selected ? (
                <div className="text-sm text-muted">Select a friend to compare taste.</div>
              ) : compare === null ? (
                <div className="text-muted animate-pulse">Computing…</div>
              ) : compare.compatibility == null ? (
                <div className="text-sm text-muted">
                  Not enough data yet — friend needs to sync stats first.
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <defs>
                          <linearGradient id="compat-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#EC4899" />
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="42" strokeWidth="10" stroke="rgba(255,255,255,0.08)" fill="none" />
                        <circle
                          cx="50" cy="50" r="42"
                          strokeWidth="10"
                          stroke="url(#compat-grad)"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${(compare.compatibility / 100) * 263.8} 263.8`}
                        />
                      </svg>
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-3xl font-extrabold">{compare.compatibility}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {selected.display_name ?? selected.id}
                      </div>
                      <div className="text-sm text-muted">
                        Based on shared top artists + genre vectors.
                      </div>
                    </div>
                  </div>

                  {compare.sharedArtists.length > 0 && (
                    <div className="mt-6">
                      <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">
                        Shared artists
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {compare.sharedArtists.slice(0, 10).map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-sm"
                          >
                            {a.images?.[0]?.url && (
                              <img src={a.images[0].url} className="w-5 h-5 rounded-full" alt="" />
                            )}
                            {a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {compare.sharedGenres.length > 0 && (
                    <div className="mt-6">
                      <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">
                        Shared genres
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {compare.sharedGenres.map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-accent/15 text-accent border border-accent/30 px-3 py-1 text-sm capitalize"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profileStats && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                          Their top artists
                        </div>
                        <ol className="space-y-2">
                          {profileStats.topArtists.fourWeeks.slice(0, 5).map((a, i) => (
                            <li key={a.id} className="flex items-center gap-3">
                              <span className="text-muted w-4 text-sm">{i + 1}</span>
                              {a.images?.[0]?.url && (
                                <img src={a.images[0].url} className="w-8 h-8 rounded-full" alt="" />
                              )}
                              <span className="truncate">{a.name}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                          Their top tracks
                        </div>
                        <ol className="space-y-2">
                          {profileStats.topTracks.fourWeeks.slice(0, 5).map((t, i) => (
                            <li key={t.id}>
                              <button
                                onClick={() => setTrackId(t.id)}
                                className="w-full flex items-center gap-3 text-left rounded-md px-1 py-1 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                              >
                                <span className="text-muted w-4 text-sm">{i + 1}</span>
                                {t.album.images?.[0]?.url && (
                                  <img src={t.album.images[0].url} className="w-8 h-8 rounded" alt="" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm">{t.name}</div>
                                  <div className="truncate text-xs text-muted">
                                    {t.artists.map((a) => a.name).join(", ")}
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardTitle hint="From your friends' top tracks">Discover</CardTitle>
          {discover === null ? (
            <div className="text-muted animate-pulse">Finding picks…</div>
          ) : discover.length === 0 ? (
            <div className="text-sm text-muted">
              Nothing yet — add friends who've synced their stats and we'll surface tracks they love but you haven't heard.
            </div>
          ) : (
            <ul className="space-y-2">
              {discover.map((d, i) => (
                <motion.li
                  key={d.track.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                  onClick={() => setTrackId(d.track.id)}
                >
                  <div className="w-5 text-right text-muted text-sm">{i + 1}</div>
                  {d.track.album.images?.[0]?.url && (
                    <img src={d.track.album.images[0].url} className="w-12 h-12 rounded" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{d.track.name}</div>
                    <div className="text-xs text-muted truncate">
                      {d.track.artists.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {d.fans.slice(0, 4).map((f) =>
                      f.avatar_url ? (
                        <img
                          key={f.id}
                          title={f.display_name ?? f.id}
                          src={f.avatar_url}
                          className="w-6 h-6 rounded-full ring-2 ring-bg"
                          alt=""
                        />
                      ) : (
                        <div
                          key={f.id}
                          title={f.display_name ?? f.id}
                          className="w-6 h-6 rounded-full bg-white/10 grid place-items-center text-[10px] ring-2 ring-bg"
                        >
                          {(f.display_name ?? f.id)[0]}
                        </div>
                      ),
                    )}
                  </div>
                  <a
                    href={`https://open.spotify.com/track/${d.track.id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn-ghost text-xs"
                  >
                    Open
                  </a>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <TrackModal trackId={trackId} onClose={() => setTrackId(null)} />
    </div>
  );
}
