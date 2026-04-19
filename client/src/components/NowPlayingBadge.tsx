import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type NowPlaying } from "../lib/api";

export function NowPlayingBadge() {
  const [np, setNp] = useState<NowPlaying | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await api.nowPlaying();
        if (!cancelled) setNp(data);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const playing = np?.is_playing && np.item;

  return (
    <AnimatePresence mode="wait">
      {playing ? (
        <motion.div
          key={np!.item!.id}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pl-1 pr-4 py-1"
        >
          <motion.img
            src={np!.item!.album.images?.[0]?.url}
            alt=""
            className="w-8 h-8 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
          <div className="text-xs leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="font-semibold text-white truncate max-w-[180px]">
                {np!.item!.name}
              </span>
            </div>
            <div className="text-muted truncate max-w-[220px]">
              {np!.item!.artists.map((a) => a.name).join(", ")}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
