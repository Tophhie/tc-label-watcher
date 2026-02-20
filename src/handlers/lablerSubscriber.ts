import { FirehoseSubscription } from "@atcute/firehose";
import type { LabelerConfig } from "../types/settings.js";
import { ComAtprotoLabelSubscribeLabels } from "@atcute/atproto";
import type PQueue from "p-queue";
import { handleNewLabel } from "./handleNewLabel.js";

export const labelerSubscriber = async (
  config: LabelerConfig,
  queue: PQueue,
) => {
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
        for (const label of message.labels) {
          queue.add(async () => {
            await handleNewLabel(config, label);
          });
        }
        break;
      }
    }
  }
};
