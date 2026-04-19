import { test } from "node:test";
import assert from "node:assert/strict";
import { compareTaste } from "./compare.js";

const snap = (artists: string[], genres: [string, number][]) => ({
  topArtists: { sixMonths: artists.map((id) => ({ id, name: id })) },
  genres: genres.map(([name, weight]) => ({ name, weight })),
});

test("returns null compatibility when either snapshot missing", () => {
  const a = snap(["x"], [["pop", 1]]);
  assert.equal(compareTaste(null, a).compatibility, null);
  assert.equal(compareTaste(a, null).compatibility, null);
});

test("100% when snapshots are identical", () => {
  const a = snap(["a1", "a2"], [["rock", 1], ["jazz", 0.5]]);
  const b = snap(["a1", "a2"], [["rock", 1], ["jazz", 0.5]]);
  assert.equal(compareTaste(a, b).compatibility, 100);
});

test("0% when there is no overlap at all", () => {
  const a = snap(["a1"], [["rock", 1]]);
  const b = snap(["a2"], [["pop", 1]]);
  const r = compareTaste(a, b);
  assert.equal(r.compatibility, 0);
  assert.deepEqual(r.sharedArtists, []);
  assert.deepEqual(r.sharedGenres, []);
});

test("partial overlap produces intermediate compatibility", () => {
  const a = snap(["a1", "a2", "a3"], [["rock", 1], ["pop", 0.5]]);
  const b = snap(["a1", "a4"], [["rock", 1], ["jazz", 0.5]]);
  const r = compareTaste(a, b);
  assert.ok(r.compatibility! > 0 && r.compatibility! < 100, `got ${r.compatibility}`);
  assert.deepEqual(
    r.sharedArtists.map((x) => x.id),
    ["a1"],
  );
  assert.deepEqual(r.sharedGenres, ["rock"]);
});

test("caps shared genres at 8", () => {
  const many: [string, number][] = Array.from({ length: 20 }, (_, i) => [`g${i}`, 1]);
  const a = snap([], many);
  const b = snap([], many);
  assert.equal(compareTaste(a, b).sharedGenres.length, 8);
});
