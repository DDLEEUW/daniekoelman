import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type ListeningSummary as Summary } from "../lib/api";
import { Card, CardTitle } from "./Card";

function fmtMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 48) return `${h}h ${rem}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function ListeningSummaryCard() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    api.listeningSummary().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return null;

  const tracked = data.trackedSince
    ? new Date(data.trackedSince).toLocaleDateString()
    : null;

  return (
    <Card delay={0.12}>
      <CardTitle hint={tracked ? `Tracked since ${tracked}` : "No plays recorded yet"}>
        Listening time
      </CardTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={fmtMinutes(data.totalMinutes)} sub={`${data.totalPlays} plays`} />
        <Stat label="This year" value={fmtMinutes(data.thisYearMinutes)} sub={`${new Date().getFullYear()}`} />
        <Stat label="This month" value={fmtMinutes(data.thisMonthMinutes)} />
        <Stat label="This week" value={fmtMinutes(data.thisWeekMinutes)} />
      </div>

      {data.perYear.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">
            By year
          </div>
          <YearBars rows={data.perYear} />
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted">
        Spotify only exposes your last 50 plays, so totals accumulate from the moment you signed up here.
        Refresh often to capture more history.
      </p>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4"
    >
      <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className="text-lg font-extrabold mt-1 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function YearBars({ rows }: { rows: { year: number; minutes: number; plays: number }[] }) {
  const max = Math.max(...rows.map((r) => r.minutes), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.year} className="flex items-center gap-3">
          <div className="w-12 text-sm text-muted font-mono">{r.year}</div>
          <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.minutes / max) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-accent/80 rounded-full"
            />
          </div>
          <div className="text-sm font-semibold w-24 text-right">{fmtMinutes(r.minutes)}</div>
          <div className="text-xs text-muted w-16 text-right">{r.plays} plays</div>
        </div>
      ))}
    </div>
  );
}
