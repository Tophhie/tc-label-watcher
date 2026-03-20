import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { PDSConfig } from "../types/settings.js";
import * as schema from "../db/schema.js";
import type PQueue from "p-queue";
import { logger } from "../logger.js";
import { FirehoseSubscription } from "@atcute/firehose";
import { ComAtprotoSyncSubscribeRepos } from "@atcute/atproto";
import { handleNewIdentityEvent } from "./handleNewIdentityEvent.js";
import { sendNewAccountNotification } from "../mailer.js";

export const pdsSubscriber = (
  config: PDSConfig,
  db: LibSQLDatabase<typeof schema>,
  queue: PQueue,
): (() => void) => {
  let cursor: number | undefined;

  const subscription = new FirehoseSubscription({
    service: `wss://${config.host}`,
    nsid: ComAtprotoSyncSubscribeRepos.mainSchema,
    params: () => ({ cursor: cursor }),
  });

  const iterator = subscription[Symbol.asyncIterator]();

  const run = async () => {
    logger.info({ host: config.host }, "Listening to PDS events");
    for await (const message of iterator) {
      // Saves the cursor for  re connect
      if ("seq" in message) {
        cursor = message.seq;
      }
      switch (message.$type) {
        case "com.atproto.sync.subscribeRepos#account": {
          logger.debug(
            {
              host: config.host,
              did: message.did,
              status: message.active,
            },
            "Identity event",
          );
          // Notify on new accounts
          if (config.notifyOnNewAccounts) {
              if (message.active == true) {
              await queue.add(() => 
                sendNewAccountNotification(config.notifyEmails, {
                  did: message.did,
                  pds: config.host
                }).catch((err) => {
                  logger.error({ err }, "Error sending new account notification email")
                })
              );
            }
          }
          // Add new identity to the work queue
          await queue.add(() =>
            handleNewIdentityEvent(
              db,
              config.host,
              message.did,
              message.active,
            ),
          );

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
