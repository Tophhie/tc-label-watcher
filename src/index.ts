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

//Leaveing this at 1 concurrency right now since some labelers do multiple labels at once I've found.
const labelQueue = new PQueue({ concurrency: 1 });
const identityQueue = new PQueue({ concurrency: 2 });
const mailQueue = new PQueue({ concurrency: 1 });

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
const labelSubscribers = Object.entries(settings.labeler)
  .map(([_, config]) => {
    if (config.labels == undefined) {
      logger.info(
        { host: config.host },
        "No labels to watch not starting subscriber for this one",
      );
      return null;
    }

    let lastCursorRow = lastCursors.find(
      (cursor) => cursor.labelerId === config.host,
    );
    let lastCursor = lastCursorRow?.cursor ?? undefined;
    //If there is not a lastcusor do a full backfill
    if (!lastCursor && config.backfillLabels) {
      lastCursor = 0;
    }
    return labelerSubscriber(
      config,
      lastCursor,
      db,
      labelQueue,
      settings.pds,
      mailQueue,
    );
  })
  .filter((x) => x !== null);

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
  await Promise.all([
    labelQueue.onIdle(),
    identityQueue.onIdle(),
    mailQueue.onIdle(),
  ]);

  logger.info("Clean shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});
