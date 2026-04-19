import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Me } from "../hooks/useAuth";
import { NowPlayingBadge } from "./NowPlayingBadge";
import { useTheme } from "../hooks/useTheme";

export function Layout({ me, children }: { me: Me; children: React.ReactNode }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();

  async function onLogout() {
    await api.logout();
    navigate("/");
    window.location.reload();
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-full text-sm transition ${
      isActive ? "bg-white/10 text-white" : "text-muted hover:text-white"
    }`;

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    `flex-1 py-3 text-center text-xs font-medium transition ${
      isActive ? "text-accent" : "text-muted"
    }`;

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <span
              className="w-8 h-8 rounded-full grid place-items-center text-white text-sm"
              style={{ backgroundImage: "linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%)" }}
              aria-hidden
            >
              🎧
            </span>
            <span className="hidden sm:inline bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
              Music Buddies
            </span>
          </motion.div>
          <nav aria-label="Main" className="hidden md:flex gap-1">
            <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
            <NavLink to="/friends" className={link}>Friends</NavLink>
            <NavLink to="/groups" className={link}>Groups</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <NowPlayingBadge />
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn-ghost !px-3"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="flex items-center gap-2 md:gap-3 md:pl-3 md:border-l md:border-white/10">
              {me.avatar_url && (
                <img src={me.avatar_url} alt="" className="w-9 h-9 rounded-full" />
              )}
              <div className="hidden lg:block text-sm">
                <div className="font-medium">{me.display_name ?? me.id}</div>
              </div>
              <button onClick={onLogout} className="btn-ghost" aria-label="Log out">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
      <footer className="text-center text-xs text-muted py-6 hidden md:block">
        Music Buddies · Powered by the Spotify Web API · Not affiliated with Spotify
      </footer>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-black/60 border-t border-white/10 flex"
      >
        <NavLink to="/dashboard" className={mobileLink}>
          <div className="text-lg leading-none">📊</div>
          <div className="mt-0.5">Dashboard</div>
        </NavLink>
        <NavLink to="/friends" className={mobileLink}>
          <div className="text-lg leading-none">👥</div>
          <div className="mt-0.5">Friends</div>
        </NavLink>
        <NavLink to="/groups" className={mobileLink}>
          <div className="text-lg leading-none">🎧</div>
          <div className="mt-0.5">Groups</div>
        </NavLink>
      </nav>
    </div>
  );
}
