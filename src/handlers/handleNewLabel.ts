import type { Label } from "@atcute/atproto/types/label/defs";
import type { LabelerConfig, PDSConfig } from "../types/settings.js";
import { logger } from "../logger.js";
import { sendLabelNotification } from "../mailer.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export const handleNewLabel = async (
  config: LabelerConfig,
  label: Label,
  db: LibSQLDatabase<typeof schema>,
  pdsConfigs: Record<string, PDSConfig>,
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
        const watchedRepo = isRepoWatched[0];
        if (watchedRepo == undefined) {
          throw new Error(`Unexpected error on watched repo: ${label.uri}`);
        }
        const pdsConfig = Object.values(pdsConfigs).find(
          (config) => config.host === watchedRepo.pdsHost,
        );
        if (pdsConfig == undefined) {
          throw new Error(`Watched repo: ${watchedRepo.did} config not found`);
        }

        logger.info(
          { action: labelConfig.action },
          `Listed label: ${label.val} found. Performing the action against: ${label.uri}`,
        );

        const existing = await db
          .select()
          .from(schema.labelsApplied)
          .where(
            and(
              eq(schema.labelsApplied.did, label.uri),
              eq(schema.labelsApplied.label, label.val),
              eq(schema.labelsApplied.labeler, config.host),
            ),
          )
          .limit(1);

        const [existingRecord] = existing;
        if (existingRecord) {
          await db
            .update(schema.labelsApplied)
            .set({
              action: labelConfig.action,
              negated: label.neg ?? false,
              dateApplied: labledDate,
            })
            .where(eq(schema.labelsApplied.id, existingRecord.id));
          logger.debug(
            { did: label.uri, label: label.val },
            "Updated existing label record",
          );
        } else {
          await db.insert(schema.labelsApplied).values({
            did: label.uri,
            label: label.val,
            labeler: config.host,
            action: labelConfig.action,
            negated: label.neg ?? false,
            dateApplied: labledDate,
          });
        }

        // Perform action
        if (labelConfig.action === "notify") {
          console.log(pdsConfig.notifyEmails);
          await sendLabelNotification(pdsConfig.notifyEmails, {
            did: label.uri,
            label: label.val,
            labeler: config.host,
            negated: label.neg ?? false,
            dateApplied: labledDate,
          });
        }

        return;
      }

      logger.warn(
        { action: labelConfig.action },
        "Listed label found but repo is not watched. Skipping",
      );
    }
  } catch (error) {
    logger.error({ error }, "Error handling new label");
  }
};
