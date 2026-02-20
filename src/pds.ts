import type PQueue from "p-queue";
import type { PDSConfig } from "./types/settings.js";
import type {} from "@atcute/atproto";
import { Client, simpleFetchHandler, ok } from "@atcute/client";

export const backFillPds = async (config: PDSConfig, queue: PQueue) => {
  const rpc = new Client({
    handler: simpleFetchHandler({ service: `https://${config.host}` }),
  });

  let cursor = undefined;

  do {
    let result = await ok(
      rpc.get("com.atproto.sync.listRepos", {
        params: {
          limit: 1000,
          cursor,
        },
      }),
    );

    cursor = result.cursor;
    for (let repo of result.repos) {
      console.log(repo.did);
    }
  } while (cursor);
};
