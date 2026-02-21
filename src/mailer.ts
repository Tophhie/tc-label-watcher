import nodemailer from "nodemailer";

const smtpUrl = process.env.NOTIFY_SMTP_URL;
const senderEmail = process.env.NOTIFY_SENDER_EMAIL;

if (!smtpUrl) throw new Error("NOTIFY_SMTP_URL is not set");
if (!senderEmail) throw new Error("NOTIFY_SENDER_EMAIL is not set");

const transporter = nodemailer.createTransport(smtpUrl);

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

  await transporter.sendMail({
    from: senderEmail,
    to: emails.join(", "),
    subject: `Label "${label}" ${negated ? "negated" : "applied"} — ${did} - ${pds}`,
    text: [
      `A label event was detected.`,
      ``,
      `DID:      ${did}`,
      `PDS:      ${pds}`,
      `Label:    ${label}`,
      `Labeler:  ${labeler}`,
      `Negated:  ${negated}`,
      `Date:     ${dateApplied.toISOString()}`,
    ].join("\n"),
  });
};
