import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type TrackDetail } from "../lib/api";

const RANGE_LABEL: Record<TrackDetail["ranks"][number]["range"], string> = {
  fourWeeks: "4 weeks",
  sixMonths: "6 months",
  allTime: "all time",
};

function fmtDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export function TrackModal({ trackId, onClose }: { trackId: string | null; onClose: () => void }) {
  const [data, setData] = useState<TrackDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) return;
    setData(null);
    setErr(null);
    api.track(trackId).then(setData).catch((e) => setErr(String(e)));
  }, [trackId]);

  useEffect(() => {
    if (!trackId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trackId, onClose]);

  return (
    <AnimatePresence>
      {trackId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="glass max-w-2xl w-full p-6 relative"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-4 text-muted hover:text-white text-2xl leading-none"
            >
              ×
            </button>

            {err ? (
              <div className="text-red-400 text-sm">Couldn't load track: {err}</div>
            ) : !data ? (
              <div className="text-muted animate-pulse py-12 text-center">Loading…</div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row gap-5">
                  {data.track.album.images?.[0]?.url && (
                    <img
                      src={data.track.album.images[0].url}
                      alt=""
                      className="w-40 h-40 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-widest text-accent font-semibold">
                      Track
                    </div>
                    <h2 className="text-2xl font-extrabold mt-1 break-words">
                      {data.track.name}
                      {data.track.explicit && (
                        <span className="ml-2 text-[10px] align-middle bg-white/10 rounded px-1.5 py-0.5 font-bold">
                          E
                        </span>
                      )}
                    </h2>
                    <div className="text-muted text-sm mt-1">
                      {data.track.artists.map((a) => a.name).join(", ")}
                    </div>
                    <div className="text-muted text-xs mt-1">
                      {data.track.album.name} · {data.track.album.release_date}
                    </div>
                    <div className="flex gap-4 text-xs text-muted mt-3">
                      <span>Duration {fmtDuration(data.track.duration_ms)}</span>
                      <span>Popularity {data.track.popularity ?? "—"}/100</span>
                    </div>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <a
                        href={data.track.external_urls.spotify}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary text-sm"
                      >
                        Open in Spotify
                      </a>
                      {data.track.preview_url && (
                        <audio
                          controls
                          src={data.track.preview_url}
                          className="h-9 max-w-[240px]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                    Your history with this track
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat
                      label="Recorded plays"
                      value={String(data.personal.plays)}
                      sub={data.personal.plays ? fmtDuration(data.track.duration_ms * data.personal.plays) : "none recorded"}
                    />
                    <MiniStat
                      label="Last played"
                      value={data.personal.lastPlayedAt ? new Date(data.personal.lastPlayedAt).toLocaleDateString() : "—"}
                      sub={data.personal.lastPlayedAt ? new Date(data.personal.lastPlayedAt).toLocaleTimeString() : undefined}
                    />
                    <MiniStat
                      label="First played"
                      value={data.personal.firstPlayedAt ? new Date(data.personal.firstPlayedAt).toLocaleDateString() : "—"}
                    />
                    <MiniStat
                      label="Minutes"
                      value={`${data.personal.totalMinutes}`}
                    />
                  </div>

                  {data.ranks.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {data.ranks.map((r) => (
                        <span
                          key={r.range}
                          className="rounded-full bg-accent/15 text-accent border border-accent/30 px-3 py-1 text-xs font-medium"
                        >
                          #{r.rank} in last {RANGE_LABEL[r.range]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-muted">
                      Not currently in your top tracks for any time range.
                    </div>
                  )}

                  <div className="mt-4 text-[11px] text-muted">
                    Play counts only include plays recorded since you joined (Spotify caps recent history at 50 tracks).
                    First played: {fmtDate(data.personal.firstPlayedAt)} · Last: {fmtDate(data.personal.lastPlayedAt)}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className="text-base font-bold mt-1 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
