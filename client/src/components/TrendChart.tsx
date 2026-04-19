import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api, type HistoryEntry } from "../lib/api";

export function TrendChart() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    api.history().then((e) => setEntries(e.slice().reverse())); // oldest → newest
  }, []);

  if (!entries) {
    return <div className="h-48 animate-pulse bg-white/5 rounded" />;
  }
  if (entries.length < 2) {
    return (
      <div className="text-sm text-muted py-6">
        Not enough history yet — check back after tomorrow's snapshot.
      </div>
    );
  }

  const data = entries.map((e) => ({
    date: new Date(e.capturedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    minutes: e.minutesRecent,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "#B3B3B3", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#B3B3B3", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#121212",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#B3B3B3" }}
            formatter={(v: number) => [`${v} min`, "Recent"]}
          />
          <defs>
            <linearGradient id="trend-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="url(#trend-grad)"
            strokeWidth={2.5}
            dot={{ fill: "#EC4899", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
