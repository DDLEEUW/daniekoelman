import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type RecentPlay } from "../lib/api";
import { Card, CardTitle } from "./Card";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function RecentPlaysCard({ onTrackClick }: { onTrackClick: (id: string) => void }) {
  const [items, setItems] = useState<RecentPlay[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .recentPlays(10)
      .then(setItems)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <Card delay={0.12}>
      <CardTitle hint="Last 10 plays">Recently played</CardTitle>
      {err ? (
        <div className="text-red-400 text-sm">Couldn't load: {err}</div>
      ) : !items ? (
        <div className="text-muted animate-pulse py-8 text-center text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-muted text-sm py-4">
          No plays recorded yet — listen to a song and hit refresh.
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((p, i) => (
            <motion.li
              key={`${p.trackId}-${p.playedAt}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
            >
              <button
                type="button"
                onClick={() => onTrackClick(p.trackId)}
                className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                <div className="w-11 h-11 rounded-lg overflow-hidden ring-1 ring-white/10 shrink-0 bg-white/5">
                  {p.albumArt && (
                    <img src={p.albumArt} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted truncate">{p.artist}</div>
                </div>
                <div className="text-[11px] text-muted whitespace-nowrap">
                  {timeAgo(p.playedAt)}
                </div>
              </button>
            </motion.li>
          ))}
        </ol>
      )}
    </Card>
  );
}
