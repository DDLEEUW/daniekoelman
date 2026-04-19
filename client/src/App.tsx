import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Friends from "./pages/Friends";
import Groups from "./pages/Groups";
import Invite from "./pages/Invite";
import { Layout } from "./components/Layout";
import { api } from "./lib/api";

export default function App() {
  const { me, loading } = useAuth();

  // After OAuth redirect, redeem any pending invite token stashed before login.
  useEffect(() => {
    if (!me) return;
    const pending = localStorage.getItem("pendingInviterId");
    if (!pending) return;
    localStorage.removeItem("pendingInviterId");
    api.acceptInvite(pending).catch(() => {
      /* non-fatal — user may have invited themselves or inviter was removed */
    });
  }, [me]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="animate-pulse text-muted">Loading…</div>
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/invite/:inviterId" element={<Invite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Layout me={me}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/invite/:inviterId" element={<Invite />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
