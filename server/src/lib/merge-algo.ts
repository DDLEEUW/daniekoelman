export type MergedTrack = {
  id: string;
  name: string;
  duration_ms: number;
  album: { name: string; images: { url: string }[] };
  artists: { id?: string; name: string }[];
  score: number;
  voters: number;
};

type SnapshotLike = {
  topTracks: {
    sixMonths?: Omit<MergedTrack, "score" | "voters">[];
    fourWeeks?: Omit<MergedTrack, "score" | "voters">[];
  };
};

/** Pure: takes an array of snapshots and returns a ranked merged playlist. */
export function mergeSnapshots(snapshots: SnapshotLike[]): MergedTrack[] {
  const scores = new Map<
    string,
    { track: Omit<MergedTrack, "score" | "voters">; score: number; voters: number }
  >();
  for (const p of snapshots) {
    const tracks = [...(p.topTracks.sixMonths ?? []), ...(p.topTracks.fourWeeks ?? [])];
    const seenInThisSnapshot = new Set<string>();
    tracks.forEach((t, i) => {
      const weight = Math.max(0.1, 1 - i * 0.04);
      const entry = scores.get(t.id) ?? { track: t, score: 0, voters: 0 };
      entry.score += weight;
      if (!seenInThisSnapshot.has(t.id)) {
        entry.voters += 1;
        seenInThisSnapshot.add(t.id);
      }
      scores.set(t.id, entry);
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.voters - a.voters || b.score - a.score)
    .slice(0, 40)
    .map((e) => ({ ...e.track, score: e.score, voters: e.voters }));
}
