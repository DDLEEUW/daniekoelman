import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../lib/api";

/**
 * Public invite landing. Stashes the inviter id and sends the visitor to /auth/login.
 * After OAuth they return to /dashboard where <InviteClaimer> redeems it.
 */
export default function Invite() {
  const { inviterId } = useParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!inviterId) return;
    // If already signed in, redeem immediately.
    api
      .me()
      .then(() =>
        api
          .acceptInvite(inviterId)
          .then(() => {
            window.location.href = "/friends";
          })
          .catch((e) => setErr(String(e))),
      )
      .catch(() => {
        localStorage.setItem("pendingInviterId", inviterId);
        window.location.href = "/auth/login";
      });
  }, [inviterId]);

  if (!inviterId) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="glass p-8 max-w-md text-center">
        <div className="text-4xl mb-3">🎵</div>
        <h1 className="text-2xl font-extrabold">You've been invited</h1>
        <p className="text-muted mt-2 text-sm">
          Sign in with Spotify to connect — the app needs both people logged in to compare taste.
        </p>
        {err && <div className="text-red-400 text-sm mt-3">{err}</div>}
      </div>
    </div>
  );
}
