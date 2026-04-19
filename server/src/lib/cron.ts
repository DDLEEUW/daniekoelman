import cron from "node-cron";
import { db } from "../db/schema.js";
import { computeStats } from "./stats.js";

/** Nightly snapshot at 03:17 local time for all users. */
export function startDailySnapshotJob(): void {
  cron.schedule("17 3 * * *", async () => {
    const users = db.prepare("SELECT id FROM users").all() as { id: string }[];
    console.log(`[cron] snapshotting ${users.length} users`);
    for (const u of users) {
      try {
        const stats = await computeStats(u.id);
        db.prepare(
          "INSERT INTO snapshots (user_id, captured_at, payload) VALUES (?, ?, ?)",
        ).run(u.id, stats.generatedAt, JSON.stringify(stats));
      } catch (err) {
        console.error(`[cron] snapshot failed for ${u.id}`, err);
      }
    }
  });
}
