import { db } from "./db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import PQueue from "p-queue";
import { labelerSubscriber } from "./handlers/lablerSubscriber.js";
import type { Settings } from "./types/settings.js";
import { logger } from "./logger.js";
import { labelerCursor } from "./db/schema.js";
import { eq } from "drizzle-orm";
const queue = new PQueue({ concurrency: 2 });

// TODO
// 1. Figure out a schema for settings we want. PDSs to watch.Labelers and their Labels
// and which actions to do for them (notification/email) or auto takedown. thinking toml file maybe?
// 2. Add a CLI argument to backfill PDS repos on start up. If finds a new active repo adds it
// 3. Add a firehose listener that subscribes to the PDSs for new identities? (I say maybe not cause of bandwidth)
// 4. We can save the last sen sequence from the labler to the db and restore it on startup for backfill

// Run Drizzle migrations on startup
migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle" });

const settingsFile = readFileSync("./settings.toml", "utf-8");

//TODO I really really don't like this unknown to settings. Figure that out later. Cause. It does work >.>
const settings = parse(settingsFile) as unknown as Settings;

const labelers = settings.labeler;

const lastCursors = await db.select().from(labelerCursor);

const subscribers = Object.entries(labelers).map(([_, config]) => {
  let lastCursorRow = lastCursors.find(
    (cursor) => cursor.labelerId === config.host,
  );
  let lastCursor = lastCursorRow?.cursor ?? undefined;
  return labelerSubscriber(config, lastCursor, db, queue);
});

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);

  logger.info("Closing subscriptions...");
  subscribers.forEach((close) => close());

  logger.info("Draining the queue...");
  await queue.onIdle();

  logger.info("Clean shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});
