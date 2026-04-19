const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Heatmap({ heatmap }: { heatmap: number[][] }) {
  const max = Math.max(1, ...heatmap.flat());
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex items-center gap-1 pl-10 mb-1 text-[10px] text-muted">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="w-4 text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {heatmap.map((row, d) => (
          <div key={d} className="flex items-center gap-1 mb-1">
            <div className="w-9 text-[11px] text-muted">{DAYS[d]}</div>
            {row.map((v, h) => {
              const ratio = v / max;
              const alpha = v === 0 ? 0.04 : 0.15 + ratio * 0.85;
              return (
                <div
                  key={h}
                  title={`${DAYS[d]} ${h}:00 — ${v} plays`}
                  className="w-4 h-4 rounded-sm transition-transform hover:scale-125"
                  style={{ background: `rgba(29, 185, 84, ${alpha})` }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
