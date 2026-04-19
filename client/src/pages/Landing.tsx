import { motion } from "framer-motion";
import { useMemo } from "react";

const errorMessages: Record<string, string> = {
  session_expired: "Your session expired — please log in again.",
  auth_failed: "Authentication with Spotify failed. Please try again.",
  access_denied: "You denied Spotify access.",
};

export default function Landing() {
  const error = useMemo(() => {
    const key = new URLSearchParams(window.location.search).get("error");
    return key ? errorMessages[key] ?? `Error: ${key}` : null;
  }, []);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-3xl text-center">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 max-w-md mx-auto"
          >
            {error}
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-muted mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-accent" />
          Music, shared with the people you vibe with
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight"
        >
          Meet your<br />
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            music buddies.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg text-muted max-w-xl mx-auto"
        >
          See your listening unfold in a colourful dashboard, discover what friends are playing,
          and build group playlists together — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <a href="/auth/login" className="btn-primary text-base">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.75.75 0 0 1-1.03.25 10.47 10.47 0 0 0-5.37-1.47c-1.22 0-2.42.2-3.55.59a.75.75 0 0 1-.48-1.42 13 13 0 0 1 4.03-.67 12 12 0 0 1 6.16 1.69c.35.22.46.68.24 1.03Zm1.24-2.78a.94.94 0 0 1-1.29.31 13.3 13.3 0 0 0-6.75-1.82 13.36 13.36 0 0 0-3.82.54.94.94 0 1 1-.54-1.8 15.3 15.3 0 0 1 4.36-.61 15.2 15.2 0 0 1 7.72 2.08c.45.28.59.87.32 1.3Zm.1-2.89C15.46 9.2 8.54 9.01 5.57 9.93a1.13 1.13 0 1 1-.66-2.16c3.43-1.05 11.08-.84 15.16 1.6a1.13 1.13 0 1 1-1.16 1.94Z"/></svg>
            Login with Spotify
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { title: "Your taste, visualized", body: "Top artists · top tracks · genre breakdown · listening heatmap — live and always fresh." },
            { title: "Compare with friends", body: "A compatibility score based on shared artists, tracks, and genre vectors." },
            { title: "Build group playlists", body: "Merge everyone's favourites and push a collaborative playlist straight to Spotify." },
          ].map((f, i) => (
            <div key={i} className="glass p-5 text-left">
              <div className="text-accent text-xs uppercase tracking-wider font-semibold mb-1">
                Feature
              </div>
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-muted mt-1">{f.body}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
