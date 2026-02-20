import { db } from "./db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import PQueue from "p-queue";
import { labelerSubscriber } from "./handlers/lablerSubscriber.js";
import type { Settings } from "./types/settings.js";
import { logger } from "./logger.js";
import { labelerCursor } from "./db/schema.js";
import { backFillPds } from "./pds.js";
import { pdsSubscriber } from "./handlers/pdsSubscriber.js";

const labelQueue = new PQueue({ concurrency: 2 });
const identityQueue = new PQueue({ concurrency: 2 });

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

let pdsConfigs = Object.entries(settings.pds).map(([_, config]) => config);

for (const config of pdsConfigs) {
  if (config.backfillAccounts) {
    await backFillPds(config, db, identityQueue);
  }
}

// Waiting for the identity queue to backfill and complete before labler
logger.info("Waiting for identity queue to backfill and complete...");
await identityQueue.onIdle();
logger.info("Identity queue backfill and completion complete.");

// Gets the last saved cursors for Labelers from db for resume
const lastCursors = await db.select().from(labelerCursor);

// Sets up the subscribers to the labelers
const labelSubscribers = Object.entries(settings.labeler).map(([_, config]) => {
  let lastCursorRow = lastCursors.find(
    (cursor) => cursor.labelerId === config.host,
  );
  let lastCursor = lastCursorRow?.cursor ?? undefined;
  return labelerSubscriber(config, lastCursor, db, labelQueue);
});

const pdsSubscribers = Object.entries(settings.pds)
  .map(([_, config]) => {
    if (config.listenForNewAccounts) {
      return pdsSubscriber(config, db, identityQueue);
    }
    return null;
  })
  .filter((x) => x !== null);

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);

  logger.info("Closing subscribers...");
  labelSubscribers.forEach((close) => close());
  pdsSubscribers.forEach((close) => close());

  logger.info("Draining the queues...");
  await Promise.all([labelQueue.onIdle(), identityQueue.onIdle()]);

  logger.info("Clean shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});
