import * as schema from "../db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { logger } from "../logger.js";

export const handleNewIdentityEvent = async (
  db: LibSQLDatabase<typeof schema>,
  pdsHost: string,
  did: string,
  active: boolean,
) => {
  try {
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
  } catch (error) {
    logger.error({ error }, "Error handling new identity event");
  }
};

export const addToNewAccountsTable = async (
  db: LibSQLDatabase<typeof schema>,
  pdsHost: string,
  did: string,
) => {
  try {
    await db
      .insert(schema.newAccounts)
      .values({
        did,
        pdsHost,
        dateFound: new Date()
      })
      .onConflictDoNothing()
  } catch (error) {
    logger.error( { error }, "Error adding new account to new account database.");
  }
}
