import { db } from "../db/schema.js";
import { mergeSnapshots, type MergedTrack } from "./merge-algo.js";

export type { MergedTrack };
export { mergeSnapshots };

export function computeMergedPlaylist(groupId: string): {
  memberCount: number;
  tracks: MergedTrack[];
} {
  const members = db
    .prepare("SELECT user_id FROM group_members WHERE group_id = ?")
    .all(groupId) as { user_id: string }[];

  const snapshots = [];
  for (const m of members) {
    const snap = db
      .prepare(
        "SELECT payload FROM snapshots WHERE user_id = ? ORDER BY captured_at DESC LIMIT 1",
      )
      .get(m.user_id) as { payload: string } | undefined;
    if (snap) snapshots.push(JSON.parse(snap.payload));
  }
  return { memberCount: members.length, tracks: mergeSnapshots(snapshots) };
}
