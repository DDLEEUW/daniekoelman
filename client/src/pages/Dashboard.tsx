import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Stats } from "../lib/api";
import { Card, CardTitle } from "../components/Card";
import { GenreChart } from "../components/GenreChart";
import { Heatmap } from "../components/Heatmap";
import { PersonalityCard } from "../components/PersonalityCard";
import { TrendChart } from "../components/TrendChart";
import { DashboardSkeleton } from "../components/Skeletons";
import { ShareButton } from "../components/ShareButton";
import { ListeningSummaryCard } from "../components/ListeningSummary";
import { RecentPlaysCard } from "../components/RecentPlays";
import { TrackModal } from "../components/TrackModal";
import { useToast } from "../components/Toast";

type TimeRange = "fourWeeks" | "sixMonths" | "allTime";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useState<TimeRange>("fourWeeks");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(String(e)));
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const s = await api.stats(true);
      setStats(s);
      toast("Stats refreshed");
    } catch {
      toast("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  if (error) return <div className="text-red-400">Failed to load: {error}</div>;
  if (!stats) return <DashboardSkeleton />;

  const hasData =
    stats.topArtists.fourWeeks.length + stats.topArtists.sixMonths.length + stats.topArtists.allTime.length > 0;
  if (!hasData) {
    return (
      <div className="glass p-12 text-center max-w-xl mx-auto mt-12">
        <div className="text-5xl mb-4">🎧</div>
        <h2 className="text-2xl font-bold">Your Spotify story hasn't started yet</h2>
        <p className="text-muted mt-2">
          Listen to some music on Spotify and come back in a day or two — we'll have your top artists,
          genre breakdown, and a vibe analysis ready.
        </p>
        <button onClick={refresh} disabled={refreshing} className="btn-primary mt-6 disabled:opacity-50">
          {refreshing ? "Checking…" : "Check again"}
        </button>
      </div>
    );
  }

  const topArtists = stats.topArtists[range];
  const topTracks = stats.topTracks[range];
  const updated = new Date(stats.generatedAt).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 flex flex-col md:flex-row items-start md:items-center gap-6"
      >
        {stats.profile.avatarUrl && (
          <img
            src={stats.profile.avatarUrl}
            className="w-20 h-20 rounded-full ring-2 ring-accent/50"
            alt=""
          />
        )}
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            Welcome back 🎵
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-1">
            {stats.profile.displayName ?? "Listener"}
          </h1>
          <div className="text-sm text-muted mt-1">Last updated {updated}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ShareButton stats={stats} toast={toast} />
          <button
            onClick={refresh}
            disabled={refreshing}
            className="btn-ghost disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </motion.div>

      {/* Personality */}
      <PersonalityCard stats={stats} />

      {/* Listening time totals */}
      <ListeningSummaryCard />

      {/* Stat band */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Top artist"
          value={stats.topArtists.fourWeeks[0]?.name ?? "—"}
          hint="Last 4 weeks"
          delay={0}
        />
        <StatTile
          label="Top genre"
          value={stats.genres[0]?.name ?? "—"}
          hint={`${stats.genres[0]?.pct.toFixed(0) ?? 0}% of taste`}
          delay={0.05}
        />
        <StatTile
          label="Recent listening"
          value={`${stats.listening.totalMinutesRecent} min`}
          hint="Last 50 plays"
          delay={0.1}
        />
        <StatTile
          label="Peak hour"
          value={stats.listening.mostActiveHour >= 0 ? `${stats.listening.mostActiveHour}:00` : "—"}
          hint={stats.listening.mostActiveHour >= 0 ? "You vibe hardest here" : "Listen more to unlock"}
          delay={0.15}
        />
      </div>

      {/* Time range switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Top picks</h2>
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
          {(
            [
              ["fourWeeks", "4 weeks"],
              ["sixMonths", "6 months"],
              ["allTime", "All time"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                range === key ? "bg-accent text-white font-semibold" : "text-muted hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Artists */}
        <Card delay={0.05}>
          <CardTitle hint={`Top ${Math.min(5, topArtists.length)}`}>Top Artists</CardTitle>
          <ol className="space-y-3">
            {topArtists.slice(0, 5).map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4"
              >
                <div className="text-xl w-6 font-bold text-muted">{i + 1}</div>
                <img
                  src={a.images?.[0]?.url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-muted truncate">
                    {(a.genres ?? []).slice(0, 3).join(" · ") || "—"}
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </Card>

        {/* Genre breakdown */}
        <Card delay={0.1}>
          <CardTitle hint="Weighted across ranges">Genre Breakdown</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <GenreChart genres={stats.genres} />
            <ul className="space-y-2">
              {stats.genres.slice(0, 8).map((g, i) => (
                <li key={g.name} className="text-sm flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{
                      background: [
                        "#8B5CF6", "#EC4899", "#22D3EE", "#F59E0B",
                        "#A78BFA", "#F472B6", "#34D399", "#60A5FA",
                      ][i % 8],
                    }}
                  />
                  <span className="flex-1 capitalize">{g.name}</span>
                  <span className="text-muted">{g.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Top Tracks */}
      <Card delay={0.15}>
        <CardTitle hint={`Top ${Math.min(10, topTracks.length)}`}>Top Tracks</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {topTracks.slice(0, 10).map((t, i) => (
            <motion.button
              type="button"
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              onClick={() => setSelectedTrackId(t.id)}
              className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded-xl"
            >
              <div className="aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition">
                {t.album.images?.[0]?.url && (
                  <img
                    src={t.album.images[0].url}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    alt=""
                  />
                )}
              </div>
              <div className="mt-2 text-sm font-medium truncate">{t.name}</div>
              <div className="text-xs text-muted truncate">
                {t.artists.map((a) => a.name).join(", ")}
              </div>
            </motion.button>
          ))}
        </div>
      </Card>

      {/* Recently played */}
      <RecentPlaysCard onTrackClick={(id) => setSelectedTrackId(id)} />

      {/* Trend */}
      <Card delay={0.18}>
        <CardTitle hint="Daily snapshots">Listening Trend</CardTitle>
        <TrendChart />
      </Card>

      <TrackModal trackId={selectedTrackId} onClose={() => setSelectedTrackId(null)} />

      {/* Heatmap */}
      <Card delay={0.2}>
        <CardTitle hint="Recent 50 plays">Listening Heatmap</CardTitle>
        <Heatmap heatmap={stats.listening.heatmap} />
        <div className="mt-4 text-xs text-muted">
          Top artist share of recent plays: {stats.listening.topArtistShare.toFixed(0)}%
        </div>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass glass-hover p-5"
    >
      <div className="text-xs uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className="text-2xl font-extrabold mt-1 truncate">{value}</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </motion.div>
  );
}
