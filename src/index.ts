import { db } from "./db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import PQueue from "p-queue";
import { labelerSubscriber } from "./handlers/lablerSubscriber.js";
import type { Settings } from "./types/settings.js";
import { logger } from "./logger.js";

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

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);

  // TODO maybe should make sure the websockets close here?

  // Drain all queues in parallel
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

Promise.all(
  Object.entries(labelers).map(([_, config]) =>
    labelerSubscriber(config, queue),
  ),
);
