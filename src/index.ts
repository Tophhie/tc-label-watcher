import { FirehoseSubscription } from "@atcute/firehose";
import { ComAtprotoLabelSubscribeLabels } from "@atcute/atproto";

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
