import { FirehoseSubscription } from "@atcute/firehose";
import { ComAtprotoLabelSubscribeLabels } from "@atcute/atproto";
import { db } from "./db/index.js";
import { migrate } from "drizzle-orm/libsql/migrator";

// TODO
// 1. Figure out a schema for settings we want. PDSs to watch.Labelers and their Labels
// and which actions to do for them (notification/email) or auto takedown. thinking toml file maybe?
// 2. Add a CLI argument to backfill PDS repos on start up. If finds a new active repo adds it
// 3. Add a firehose listner that subsribes to the PDSs for new identies? (I say maybe not cause of bandwidth)

// Run Drizzle migrations on  startup
migrate(db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? "drizzle" });

const listner = async (id: string, wss: string) => {
  const subscription = new FirehoseSubscription({
    service: wss,
    nsid: ComAtprotoLabelSubscribeLabels.mainSchema,
  });

  console.log(`Listening to ${id}`);
  for await (const message of subscription) {
    switch (message.$type) {
      case "com.atproto.label.subscribeLabels#info": {
        console.log("commit:", message);
        break;
      }
      case "com.atproto.label.subscribeLabels#labels": {
        // repository commit (record creates, updates, deletes)
        for (const label of message.labels) {
          console.log(`From: ${id}`);
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

Promise.all([
  listner("skywatch", "wss://ozone.skywatch.blue"),
  listner("bsky", "wss://mod.bsky.app"),
]);
