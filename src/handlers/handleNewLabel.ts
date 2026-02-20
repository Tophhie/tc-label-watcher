import type { Label } from "@atcute/atproto/types/label/defs";
import type { LabelerConfig } from "../types/settings.js";
import { logger } from "../logger.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../db/schema.js";

export const handleNewLabel = async (
  config: LabelerConfig,
  label: Label,
  db: LibSQLDatabase<typeof schema>,
) => {
  // TODO: MAKE SURE TO CHECK NEG
  logger.info({ host: config.host }, "From");

  await new Promise((r) => setTimeout(r, 2000));

  if (config.labels[label.val]) {
    logger.info(
      { action: config.labels[label.val]?.action },
      "Listed label found. Performing the action",
    );
  }
  logger.info(
    { src: label.src, val: label.val, uri: label.uri, neg: label.neg },
    "Label",
  );
};
