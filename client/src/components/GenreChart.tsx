import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#8B5CF6", "#EC4899", "#22D3EE", "#F59E0B", "#A78BFA", "#F472B6", "#34D399", "#60A5FA", "#FB7185", "#C084FC", "#FBBF24", "#4ADE80"];

export function GenreChart({ genres }: { genres: { name: string; pct: number }[] }) {
  const data = genres.slice(0, 8);
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="pct"
            nameKey="name"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
            formatter={(v: number, n) => [`${v.toFixed(1)}%`, n as string]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
