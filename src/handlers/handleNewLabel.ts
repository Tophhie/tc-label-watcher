import type { Label } from "@atcute/atproto/types/label/defs";
import type { LabelerConfig } from "../types/settings.js";
import { logger } from "../logger.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../db/schema.js";
import { count, eq } from "drizzle-orm";

export const handleNewLabel = async (
  config: LabelerConfig,
  label: Label,
  db: LibSQLDatabase<typeof schema>,
) => {
  try {
    // TODO: MAKE SURE TO CHECK NEG
    let labledDate = new Date(label.cts);
    logger.debug(
      {
        labeler: config.host,
        val: label.val,
        uri: label.uri,
        neg: label.neg,
        date: labledDate,
      },
      "Label",
    );

    let labelConfig = config.labels[label.val];
    if (labelConfig) {
      const isRepoWatched = await db
        .select()
        .from(schema.watchedRepos)
        .where(eq(schema.watchedRepos.did, label.uri))
        .limit(1);

      if (isRepoWatched.length > 0) {
        logger.info(
          { action: config.labels[label.val]?.action },
          `Listed label: ${label.val} found. Performing the action against: ${label.uri}`,
        );

        await db.insert(schema.labelsApplied).values({
          did: label.uri,
          label: label.val,
          labeler: config.host,
          action: labelConfig.action,
          negated: label.neg ?? false,
          dateApplied: labledDate,
        });

        return;
      }
      logger.warn(
        { action: config.labels[label.val]?.action },
        "Listed label found but repo is not watched. Skipping",
      );
    }
  } catch (error) {
    logger.error({ error }, "Error handling new label");
  }
};
