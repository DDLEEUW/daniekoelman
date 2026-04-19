import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSnapshots } from "./merge-algo.js";

const trackLite = (id: string) => ({
  id,
  name: `Track ${id}`,
  duration_ms: 180_000,
  album: { name: "Album", images: [] },
  artists: [{ name: "Artist" }],
});

const snap = (topTracks: string[]) => ({
  topTracks: {
    fourWeeks: topTracks.map(trackLite),
    sixMonths: topTracks.map(trackLite),
  },
});

test("returns empty list for empty input", () => {
  assert.deepEqual(mergeSnapshots([]), []);
});

test("single member: all tracks appear with 1 voter", () => {
  const out = mergeSnapshots([snap(["t1", "t2", "t3"])]);
  assert.equal(out.length, 3);
  for (const t of out) assert.equal(t.voters, 1);
});

test("tracks loved by more members rank higher (voter count wins)", () => {
  const merged = mergeSnapshots([
    snap(["shared", "onlyA"]),
    snap(["shared", "onlyB"]),
    snap(["shared", "onlyC"]),
  ]);
  assert.equal(merged[0].id, "shared");
  assert.equal(merged[0].voters, 3);
  assert.ok(merged.slice(1).every((t) => t.voters === 1));
});

test("caps output at 40 tracks", () => {
  const ids = Array.from({ length: 100 }, (_, i) => `t${i}`);
  const out = mergeSnapshots([snap(ids)]);
  assert.equal(out.length, 40);
});

test("when voters tie, higher score wins (earlier rank)", () => {
  // Two members: t1 is #1 for A and #20 for B. t2 is #20 for A and #1 for B.
  // Both have 2 voters — tie. But t1's combined score should roughly equal t2's since order is symmetric.
  // Test a real asymmetry: member A has t1 at #1, member B at #1 too. Member A has t2 at #20, member B at #20.
  // Then t1 should come first.
  const A = snap(["t1", ...Array.from({ length: 19 }, (_, i) => `pad${i}`), "t2"]);
  const B = snap(["t1", ...Array.from({ length: 19 }, (_, i) => `padB${i}`), "t2"]);
  const merged = mergeSnapshots([A, B]);
  const t1Idx = merged.findIndex((t) => t.id === "t1");
  const t2Idx = merged.findIndex((t) => t.id === "t2");
  assert.ok(t1Idx < t2Idx, `t1 (idx ${t1Idx}) should outrank t2 (idx ${t2Idx})`);
});
