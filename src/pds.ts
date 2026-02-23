import type PQueue from "p-queue";
import type { PDSConfig } from "./types/settings.js";
import type {} from "@atcute/atproto";
import { Client, simpleFetchHandler, ok } from "@atcute/client";
import * as schema from "./db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { handleNewIdentityEvent } from "./handlers/handleNewIdentityEvent.js";
import { logger } from "./logger.js";

export const backFillPds = async (
  config: PDSConfig,
  db: LibSQLDatabase<typeof schema>,
  queue: PQueue,
) => {
  logger.info(`Starting backfill process for ${config.host}`);

  const rpc = new Client({
    handler: simpleFetchHandler({ service: `https://${config.host}` }),
  });

  let cursor: string | undefined;

  do {
    const result = await ok(
      rpc.get("com.atproto.sync.listRepos", {
        params: {
          limit: 1000,
          cursor,
        },
      }),
    );

    for (const repo of result.repos) {
      if (repo.active) {
        await queue.add(() =>
          handleNewIdentityEvent(db, config.host, repo.did, true),
        );
      }
    }

    cursor = result.cursor;
  } while (cursor);
  logger.info(`Backfill process for ${config.host} completed`);
};
