import { FirehoseSubscription } from "@atcute/firehose";
import type { LabelerConfig, PDSConfig } from "../types/settings.js";
import { ComAtprotoLabelSubscribeLabels } from "@atcute/atproto";
import type PQueue from "p-queue";
import { handleNewLabel } from "./handleNewLabel.js";
import { logger } from "../logger.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { labelerCursor } from "../db/schema.js";
import * as schema from "../db/schema.js";

export const labelerSubscriber = (
  config: LabelerConfig,
  lastCursor: number | undefined,
  db: LibSQLDatabase<typeof schema>,
  queue: PQueue,
  pdsConfigs: Record<string, PDSConfig>,
  mailQueue: PQueue,
): (() => void) => {
  let cursor = lastCursor;
  if (cursor) {
    logger.info({ host: config.host }, `Starting from cursor: ${cursor}`);
  }

  const subscription = new FirehoseSubscription({
    service: `wss://${config.host}`,
    nsid: ComAtprotoLabelSubscribeLabels.mainSchema,
    params: () => ({ cursor: cursor }),
  });

  const iterator = subscription[Symbol.asyncIterator]();

  const run = async () => {
    logger.info({ host: config.host }, "Listening");
    for await (const message of iterator) {
      // Saves the cursor for resume and re connect
      if ("seq" in message) {
        cursor = message.seq;
        // May change to only save cursor every so often to cut down on writes
        // if (cursor % 10 === 0) {
        await db
          .insert(labelerCursor)
          .values({ labelerId: config.host, cursor: message.seq })
          .onConflictDoUpdate({
            target: [labelerCursor.labelerId],
            set: { cursor: message.seq },
          });
        // }
      }
      switch (message.$type) {
        case "com.atproto.label.subscribeLabels#info": {
          logger.info({ message }, "info event");
          break;
        }
        case "com.atproto.label.subscribeLabels#labels": {
          for (const label of message.labels) {
            queue.add(async () => {
              await handleNewLabel(config, label, db, pdsConfigs, mailQueue);
            });
          }
          break;
        }
      }
    }
  };

  run().catch((err) => logger.error({ err }, "Subscriber error"));

  return () => {
    iterator.return?.();
  };
};
