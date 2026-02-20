import { FirehoseSubscription } from "@atcute/firehose";
import { ComAtprotoLabelSubscribeLabels } from "@atcute/atproto";

const subscription = new FirehoseSubscription({
  service: "wss://ozone.skywatch.blue",
  nsid: ComAtprotoLabelSubscribeLabels.mainSchema,
});

console.log("starting");
for await (const message of subscription) {
  switch (message.$type) {
    case "com.atproto.label.subscribeLabels#info": {
      console.log("commit:", message);
      break;
    }
    case "com.atproto.label.subscribeLabels#labels": {
      // repository commit (record creates, updates, deletes)
      for (const label of message.labels) {
        console.log("Label from: ", label.src);
        console.log("Label: ", label.val);
        console.log("Label for: ", label.uri);
      }
      break;
    }
  }
}
