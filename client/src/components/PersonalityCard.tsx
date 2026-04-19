import { motion } from "framer-motion";
import type { Stats } from "../lib/api";

/** Pick a fun one-liner based on top genres + listening patterns. */
function personalityFor(stats: Stats): { title: string; sub: string; emoji: string } {
  const topGenre = stats.genres[0]?.name ?? "";
  const g = topGenre.toLowerCase();
  const hour = stats.listening.mostActiveHour;
  const lateNight = hour >= 0 && (hour >= 22 || hour < 5);
  const obsessed = stats.listening.topArtistShare > 30;

  if (obsessed) {
    const a = stats.topArtists.fourWeeks[0]?.name ?? "someone";
    return {
      title: `You're in your ${a} era`,
      sub: `${stats.listening.topArtistShare.toFixed(0)}% of your recent plays are them. Obsessed? A little.`,
      emoji: "💿",
    };
  }
  if (lateNight) {
    return {
      title: "Night-owl mode",
      sub: `Peak listening at ${stats.listening.mostActiveHour}:00 — the world sleeps, you vibe.`,
      emoji: "🌙",
    };
  }
  if (g.includes("indie")) return { title: "Indie darling", sub: "You've got taste, the kind that posts niche Letterboxd reviews.", emoji: "🎸" };
  if (g.includes("hip hop") || g.includes("rap")) return { title: "Hip-hop head", sub: "Bars on bars. You know what rotation means.", emoji: "🎤" };
  if (g.includes("pop")) return { title: "Pop purist", sub: "Hooks, choruses, vibes — you're wired for them.", emoji: "✨" };
  if (g.includes("rock") || g.includes("metal")) return { title: "Amp stack soul", sub: "Guitars are a love language and yours is fluent.", emoji: "🤘" };
  if (g.includes("electronic") || g.includes("house") || g.includes("techno") || g.includes("edm")) return { title: "Floor filler", sub: "Kick drums are your love language. BPM is life.", emoji: "🪩" };
  if (g.includes("jazz")) return { title: "Blue note appreciator", sub: "You hear the spaces between the notes.", emoji: "🎷" };
  if (g.includes("classical")) return { title: "Concerto connoisseur", sub: "Movements > tracks. Tempo > tempo drops.", emoji: "🎻" };
  if (g.includes("lo-fi") || g.includes("lofi") || g.includes("ambient")) return { title: "Chill seeker", sub: "Your playlist is a calm place and the world could learn from it.", emoji: "🫧" };
  if (g.includes("country") || g.includes("folk")) return { title: "Story-song listener", sub: "Lyrics hit you harder than most. Cozy energy.", emoji: "🪕" };
  if (g.includes("k-pop") || g.includes("kpop")) return { title: "Stan certified", sub: "Visuals, bops, choreography — you respect the whole package.", emoji: "🎏" };
  if (g.includes("latin") || g.includes("reggaeton")) return { title: "Ritmo real", sub: "You hear a dembow and your shoulders move before you do.", emoji: "🔥" };
  if (topGenre) return { title: `${capitalize(topGenre)} fanatic`, sub: "Your algorithm has taste. So do you.", emoji: "🎵" };
  return { title: "Music omnivore", sub: "Genre-fluid. You take taste on its own terms.", emoji: "🎧" };
}

function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PersonalityCard({ stats }: { stats: Stats }) {
  const p = personalityFor(stats);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 relative overflow-hidden"
    >
      <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="flex items-center gap-4 relative">
        <div className="text-5xl">{p.emoji}</div>
        <div>
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            Your vibe
          </div>
          <div className="text-2xl font-extrabold mt-1">{p.title}</div>
          <div className="text-sm text-muted mt-1 max-w-md">{p.sub}</div>
        </div>
      </div>
    </motion.div>
  );
}
