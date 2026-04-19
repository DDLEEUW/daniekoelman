import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  type Group,
  type GroupDetail,
  type FriendLite,
  type MergedPlaylist,
} from "../lib/api";
import { Card, CardTitle } from "../components/Card";
import { useToast } from "../components/Toast";

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [merged, setMerged] = useState<MergedPlaylist | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.groups().then(setGroups);
    api.friends().then(setFriends);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    setMerged(null);
    api.group(selected).then(setDetail);
    api.mergedPlaylist(selected).then(setMerged);
  }, [selected]);

  async function sync() {
    if (!selected) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await api.syncToSpotify(selected);
      setSyncMsg(`Synced! Playlist ID: ${r.playlistId}`);
      toast("Pushed to Spotify 🎉");
    } catch (e) {
      setSyncMsg(`Error: ${e}`);
      toast("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Groups</h1>
          <p className="text-muted text-sm">
            Create a group with friends to auto-merge your tastes into a shared playlist.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          + New group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardTitle hint={`${groups.length}`}>Your groups</CardTitle>
          {groups.length === 0 ? (
            <div className="text-sm text-muted">No groups yet.</div>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li
                  key={g.id}
                  onClick={() => setSelected(g.id)}
                  className={`cursor-pointer p-3 rounded-lg border transition ${
                    selected === g.id
                      ? "bg-accent/15 border-accent/40"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-muted">
                    {g.spotify_playlist_id ? "Synced to Spotify" : "Not synced yet"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          {!selected ? (
            <div className="text-muted text-sm">Select a group to see its merged playlist.</div>
          ) : !detail || !merged ? (
            <div className="text-muted animate-pulse">Loading…</div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{detail.name}</h2>
                  <div className="text-sm text-muted">{detail.members.length} members</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={sync} disabled={syncing} className="btn-primary disabled:opacity-50">
                    {syncing ? "Syncing…" : detail.spotify_playlist_id ? "Re-sync to Spotify" : "Push to Spotify"}
                  </button>
                </div>
              </div>

              {syncMsg && (
                <div className="mb-4 text-sm rounded-lg bg-white/5 border border-white/10 p-3">
                  {syncMsg}
                </div>
              )}

              <div className="flex -space-x-2 mb-6">
                {detail.members.map((m) =>
                  m.avatar_url ? (
                    <img
                      key={m.id}
                      src={m.avatar_url}
                      title={m.display_name ?? m.id}
                      className="w-9 h-9 rounded-full ring-2 ring-bg"
                      alt=""
                    />
                  ) : (
                    <div
                      key={m.id}
                      className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-xs ring-2 ring-bg"
                    >
                      {(m.display_name ?? m.id)[0]}
                    </div>
                  ),
                )}
              </div>

              <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                Merged top tracks · {merged.tracks.length}
              </div>
              <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {merged.tracks.map((t, i) => (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                  >
                    <div className="w-5 text-right text-muted text-sm">{i + 1}</div>
                    {t.album.images?.[0]?.url && (
                      <img src={t.album.images[0].url} className="w-10 h-10 rounded" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{t.name}</div>
                      <div className="text-xs text-muted truncate">
                        {t.artists.map((a) => a.name).join(", ")}
                      </div>
                    </div>
                    <div className="text-xs text-muted whitespace-nowrap">
                      {t.voters} / {merged.memberCount} fans
                    </div>
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <AnimatePresence>
        {creating && (
          <CreateGroupModal
            friends={friends}
            onClose={() => setCreating(false)}
            onCreated={async () => {
              setCreating(false);
              setGroups(await api.groups());
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateGroupModal({
  friends,
  onClose,
  onCreated,
}: {
  friends: FriendLite[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createGroup(name.trim(), [...selected]);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass p-6 w-full max-w-md"
      >
        <h3 className="text-xl font-bold mb-4">New group</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-accent/60 mb-4"
        />
        <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">
          Add friends
        </div>
        {friends.length === 0 ? (
          <div className="text-sm text-muted">No friends yet — you can add members later.</div>
        ) : (
          <ul className="max-h-64 overflow-y-auto space-y-1">
            {friends.map((f) => (
              <li
                key={f.id}
                onClick={() => toggle(f.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                  selected.has(f.id) ? "bg-accent/20" : "hover:bg-white/5"
                }`}
              >
                {f.avatar_url && <img src={f.avatar_url} className="w-8 h-8 rounded-full" alt="" />}
                <div className="flex-1 truncate">{f.display_name ?? f.id}</div>
                <div
                  className={`w-5 h-5 rounded border ${
                    selected.has(f.id) ? "bg-accent border-accent" : "border-white/30"
                  }`}
                />
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} className="btn-primary disabled:opacity-50">
            {saving ? "Creating…" : "Create group"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
