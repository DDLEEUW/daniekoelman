import { forwardRef } from "react";
import type { Stats } from "../lib/api";

/** Pretty, branded card suitable for rendering to a PNG via html-to-image. */
export const ShareCard = forwardRef<HTMLDivElement, { stats: Stats }>(function ShareCard(
  { stats },
  ref,
) {
  const top = stats.topArtists.fourWeeks.slice(0, 5);
  const topTracks = stats.topTracks.fourWeeks.slice(0, 4);
  const topGenre = stats.genres[0];

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1080,
        background:
          "radial-gradient(650px 450px at 12% 8%, rgba(139,92,246,0.45), transparent 62%), radial-gradient(650px 450px at 88% 82%, rgba(236,72,153,0.38), transparent 62%), #0E0B1F",
        color: "white",
        padding: 64,
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              backgroundImage: "linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%)",
              display: "grid",
              placeItems: "center",
              color: "white",
            }}
          >
            🎧
          </div>
          Music Buddies
        </div>
        <div style={{ fontSize: 14, color: "#B3B3B3", letterSpacing: 3, textTransform: "uppercase" }}>
          My last 4 weeks
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 18,
            letterSpacing: 4,
            color: "#F472B6",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Listening like
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 6 }}>
          {stats.profile.displayName ?? "a true music fan"}
        </div>
        {topGenre && (
          <div style={{ fontSize: 28, color: "#B3B3B3", marginTop: 8, textTransform: "capitalize" }}>
            {topGenre.name} energy · {topGenre.pct.toFixed(0)}% of your taste
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <div
            style={{
              fontSize: 16,
              letterSpacing: 3,
              color: "#B3B3B3",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Top artists
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {top.map((a, i) => (
              <li
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 20, width: 24, color: "#B3B3B3", fontWeight: 700 }}>
                  {i + 1}
                </div>
                {a.images?.[0]?.url && (
                  <img
                    src={a.images[0].url}
                    crossOrigin="anonymous"
                    style={{ width: 52, height: 52, borderRadius: 999 }}
                  />
                )}
                <div style={{ fontSize: 24, fontWeight: 600 }}>{a.name}</div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div
            style={{
              fontSize: 16,
              letterSpacing: 3,
              color: "#B3B3B3",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Top tracks
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {topTracks.map((t) => (
              <div key={t.id}>
                {t.album.images?.[0]?.url && (
                  <img
                    src={t.album.images[0].url}
                    crossOrigin="anonymous"
                    style={{ width: "100%", borderRadius: 12 }}
                  />
                )}
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: "#B3B3B3" }}>
                  {t.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#B3B3B3",
          fontSize: 14,
        }}
      >
        <div>
          Peak hour {stats.listening.mostActiveHour}:00 · {stats.listening.totalMinutesRecent} min recent
        </div>
        <div>Music Buddies</div>
      </div>
    </div>
  );
});
