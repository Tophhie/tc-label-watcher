import { logger } from "./logger.js";
import { getInfoFromParams } from "./mailer.js";

export const sendWebhookNotification = async (
  webhookUrl: string,
  params: {
    did: string;
    pds: string;
    label: string;
    labeler: string;
    negated: boolean;
    dateApplied: Date;
    takeDown: boolean;
    targetUri: string;
    takedownSuccess?: boolean;
  },
) => {
  const text = getInfoFromParams(params);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      content: text,
      dateApplied: params.dateApplied.toISOString(),
    }),
  });

  if (!response.ok) {
    logger.error(
      { status: response.status, webhookUrl },
      "Webhook notification failed",
    );
  }
};
