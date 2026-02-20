import { FirehoseSubscription } from "@atcute/firehose";
import { ComAtprotoLabelSubscribeLabels } from "@atcute/atproto";
import { db } from "./db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import type { LabelerConfig, Settings } from "./types/settings.js";

// TODO
// 1. Figure out a schema for settings we want. PDSs to watch.Labelers and their Labels
// and which actions to do for them (notification/email) or auto takedown. thinking toml file maybe?
// 2. Add a CLI argument to backfill PDS repos on start up. If finds a new active repo adds it
// 3. Add a firehose listener that subscribes to the PDSs for new identities? (I say maybe not cause of bandwidth)
// 4. We can save the last sen sequence from the labler to the db and restore it on startup for backfill

// Run Drizzle migrations on startup
migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle" });

const settingsFile = readFileSync("./settings.toml", "utf-8");

//TODO I really really don't like this unknown to settings. Figure that out later
const settings = parse(settingsFile) as unknown as Settings;

const labelers = settings.labeler;

const labelerSubscriber = async (config: LabelerConfig) => {
  const subscription = new FirehoseSubscription({
    service: `wss://${config.host}`,
    nsid: ComAtprotoLabelSubscribeLabels.mainSchema,
  });

  console.log(`Listening to ${config.host}`);
  for await (const message of subscription) {
    switch (message.$type) {
      case "com.atproto.label.subscribeLabels#info": {
        console.log("commit:", message);
        break;
      }
      case "com.atproto.label.subscribeLabels#labels": {
        // repository commit (record creates, updates, deletes)
        for (const label of message.labels) {
          console.log(`From: ${config.host}`);

          if (config.labels[label.val]) {
            console.log(
              `Listed label found. Performing the action: ${config.labels[label.val]?.action}`,
            );
            console.log("\n");
          }
          console.log("Label from: ", label.src);
          console.log("Label: ", label.val);
          console.log("Label for: ", label.uri);
          console.log("\n");
        }
        break;
      }
    }
  }
};

Promise.all(
  Object.entries(labelers).map(([_, config]) => labelerSubscriber(config)),
);
