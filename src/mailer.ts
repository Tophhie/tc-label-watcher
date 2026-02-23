import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger.js";

const resendApiKey = process.env.RESEND_API_KEY;
const smtpUrl = process.env.NOTIFY_SMTP_URL;
const senderEmail = process.env.NOTIFY_SENDER_EMAIL;

if (!resendApiKey && !smtpUrl) {
  throw new Error("Either RESEND_API_KEY or NOTIFY_SMTP_URL must be set");
}
if (!senderEmail) throw new Error("NOTIFY_SENDER_EMAIL is not set");

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const transporter =
  !resendApiKey && smtpUrl ? nodemailer.createTransport(smtpUrl) : null;

export const sendLabelNotification = async (
  emails: string[],
  params: {
    did: string;
    pds: string;
    label: string;
    labeler: string;
    negated: boolean;
    dateApplied: Date;
  },
) => {
  const { did, pds, label, labeler, negated, dateApplied } = params;

  const subject = `Label "${label}" ${negated ? "negated" : "applied"} — ${did} - ${pds}`;
  const text = [
    `A label event was detected.`,
    ``,
    `DID:      ${did}`,
    `PDS:      ${pds}`,
    `Label:    ${label}`,
    `Labeler:  ${labeler}`,
    `Negated:  ${negated}`,
    `Date:     ${dateApplied.toISOString()}`,
  ].join("\n");

  if (resend) {
    await resend.emails.send({
      from: senderEmail,
      to: emails,
      subject,
      text,
    });
  } else {
    if (transporter) {
      await transporter.sendMail({
        from: senderEmail,
        to: emails.join(", "),
        subject,
        text,
      });
    } else {
      logger.error(
        {
          error: "No transporter available",
        },
        "Error sending email",
      );
    }
  }
};
