import * as schema from "../db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

export const handleNewIdentityEvent = async (
  db: LibSQLDatabase<typeof schema>,
  pdsHost: string,
  did: string,
  active: boolean,
) => {
  await db
    .insert(schema.watchedRepos)
    .values({
      did,
      pdsHost,
      active,
      dateFirstSeen: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.watchedRepos.did,
      set: {
        pdsHost,
        active,
      },
    });
};
