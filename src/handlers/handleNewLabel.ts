import type { Label } from "@atcute/atproto/types/label/defs";
import type { LabelerConfig, PDSConfig } from "../types/settings.js";
import { logger } from "../logger.js";
import { sendLabelNotification } from "../mailer.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import type PQueue from "p-queue";
import { Client, simpleFetchHandler } from "@atcute/client";
import { ComAtprotoAdminUpdateSubjectStatus } from "@atcute/atproto";
import { sendWebhookNotification } from "../webhook.js";
const adminAuthHeader = (password: string) => ({
  Authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`,
});

export const handleNewLabel = async (
  config: LabelerConfig,
  label: Label,
  db: LibSQLDatabase<typeof schema>,
  pdsConfigs: Record<string, PDSConfig>,
  mailQueue: PQueue,
) => {
  try {
    let targetDid = "";
    if (label.uri.startsWith("did:")) {
      // Identity label
      targetDid = label.uri;
    } else {
      // Content label for a Record
      //TODO need to pass on the full url later for logging to the db and notifiation
      let atUriSplit = label.uri.split("/");
      let repoDid = atUriSplit[2];
      if (repoDid === undefined) {
        throw new Error(`Invalid URI: ${label.uri}`);
      }
      targetDid = repoDid;
    }

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
    //If the label is a watched one dig in
    if (labelConfig) {
      const isRepoWatched = await db
        .select()
        .from(schema.watchedRepos)
        .where(
          and(
            eq(schema.watchedRepos.did, targetDid),
            eq(schema.watchedRepos.active, true),
          ),
        )
        .limit(1);

      //If a watched repo/user is the target of the label dig in
      if (isRepoWatched.length > 0) {
        const watchedRepo = isRepoWatched[0];
        if (watchedRepo == undefined) {
          throw new Error(`Unexpected error on watched repo: ${targetDid}`);
        }
        const pdsConfig = Object.values(pdsConfigs).find(
          (config) => config.host === watchedRepo.pdsHost,
        );
        if (pdsConfig == undefined) {
          throw new Error(`Watched repo: ${watchedRepo.did} config not found`);
        }

        logger.info(
          { label: label.val, action: labelConfig.action },
          `Listed label: ${label.val} found added to ${watchedRepo.did}`,
        );

        // Check if this label already exists
        const existing = await db
          .select()
          .from(schema.labelsApplied)
          .where(
            and(
              eq(schema.labelsApplied.did, targetDid),
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
            { did: targetDid, label: label.val },
            "Updated existing label record",
          );
        } else {
          await db.insert(schema.labelsApplied).values({
            did: targetDid,
            label: label.val,
            labeler: config.host,
            action: labelConfig.action,
            negated: label.neg ?? false,
            dateApplied: labledDate,
          });
        }

        // Perform action
        switch (labelConfig.action) {
          case "notify":
            const notificationParams = {
              did: targetDid,
              pds: pdsConfig.host,
              label: label.val,
              labeler: config.host,
              negated: label.neg ?? false,
              dateApplied: labledDate,
              targetUri: label.uri,
              takeDown: false,
            };

            await mailQueue.add(() =>
              sendLabelNotification(pdsConfig.notifyEmails, notificationParams).catch((err) =>
                logger.error({ err }, "Error sending label notification email"),
              ),
            );

            if (pdsConfig.notifyWebhookUrl) {
              await mailQueue.add(() =>
                sendWebhookNotification(pdsConfig.notifyWebhookUrl!, notificationParams).catch((err) =>
                  logger.error({ err }, "Error sending webhook notification"),
                ),
              );
            }
            break;
          case "takedown": {
            // Can be a successful takedown or not
            let takedownActionSucceededs: boolean | undefined;

            if (pdsConfig.pdsAdminPassword) {
              const rpc = new Client({
                handler: simpleFetchHandler({
                  service: `https://${pdsConfig.host}`,
                }),
              });

              try {
                if (label.neg) {
                  logger.info({ did: targetDid }, "Reversing takedown");
                  await rpc.call(ComAtprotoAdminUpdateSubjectStatus, {
                    input: {
                      subject: {
                        $type: "com.atproto.admin.defs#repoRef",
                        did: targetDid as `did:${string}:${string}.`,
                      },
                      takedown: {
                        applied: false,
                      },
                    },
                    headers: adminAuthHeader(pdsConfig.pdsAdminPassword),
                  });

                  await db
                    .update(schema.watchedRepos)
                    .set({
                      takeDownIssuedDate: null,
                    })
                    .where(eq(schema.watchedRepos.did, targetDid));

                  logger.info(
                    { did: targetDid },
                    "Takedown reversed successfully",
                  );
                  takedownActionSucceededs = true;
                } else {
                  if (!watchedRepo.takeDownIssuedDate) {
                    logger.info({ did: targetDid }, "Issuing takedown");
                    await rpc.call(ComAtprotoAdminUpdateSubjectStatus, {
                      input: {
                        subject: {
                          $type: "com.atproto.admin.defs#repoRef",
                          did: targetDid as `did:${string}:${string}.`,
                        },
                        takedown: {
                          applied: true,
                          ref: Math.floor(Date.now() / 1000).toString(),
                        },
                      },
                      headers: adminAuthHeader(pdsConfig.pdsAdminPassword),
                    });

                    await db
                      .update(schema.watchedRepos)
                      .set({
                        takeDownIssuedDate: new Date(),
                      })
                      .where(eq(schema.watchedRepos.did, targetDid));

                    logger.info(
                      { did: targetDid },
                      "Takedown issued successfully",
                    );
                    takedownActionSucceededs = true;
                  } else {
                    logger.info(
                      { did: targetDid },
                      "Duplicate event, not reissuing a takedown",
                    );
                  }
                }
              } catch (err) {
                takedownActionSucceededs = false;
                logger.error(
                  { err, did: targetDid },
                  label.neg
                    ? "Failed to reverse takedown"
                    : "Failed to issue takedown",
                );
              }
            } else {
              logger.warn(
                { did: targetDid },
                "PDS admin password not set, takedown not issued",
              );
            }

            const notificationParams = {
              did: targetDid,
              pds: pdsConfig.host,
              label: label.val,
              labeler: config.host,
              negated: label.neg ?? false,
              dateApplied: labledDate,
              takeDown: true,
              targetUri: label.uri,
              takedownSuccess: takedownActionSucceededs,
            };

            await mailQueue.add(() =>
              sendLabelNotification(pdsConfig.notifyEmails, notificationParams).catch((err) =>
                logger.error(
                  { err },
                  "Error sending takedown notification email",
                ),
              ),
            );

            if (pdsConfig.notifyWebhookUrl) {
              await mailQueue.add(() =>
                sendWebhookNotification(pdsConfig.notifyWebhookUrl!, notificationParams).catch((err) =>
                  logger.error(
                    { err },
                    "Error sending takedown webhook notification",
                  ),
                ),
              );
            }
            break;
          }
        }

        return;
      }

      logger.debug(
        { label: label.val, action: labelConfig.action },
        "Listed label found but repo is not watched. Skipping",
      );
    }
  } catch (error) {
    logger.error({ error }, "Error handling new label");
  }
};
