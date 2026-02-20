import type { Label } from "@atcute/atproto/types/label/defs";
import type { LabelerConfig } from "../types/settings.js";

export const handleNewLabel = async (config: LabelerConfig, label: Label) => {
  // TODO: MAKE SURE TO CHECK NEG
  console.log(`From: ${config.host}`);

  await new Promise((r) => setTimeout(r, 2000));

  if (config.labels[label.val]) {
    console.log(
      `Listed label found. Performing the action: ${config.labels[label.val]?.action}`,
    );
    console.log("\n");
  }
  console.log("Label from: ", label.src);
  console.log("Label: ", label.val);
  console.log("Label for: ", label.uri);
  console.log("neg:", label.neg);
  console.log("\n");
};
