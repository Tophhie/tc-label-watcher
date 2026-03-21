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

export const getInfoFromParams = (params: {
  did: string;
  pds: string;
  label: string;
  labeler: string;
  negated: boolean;
  dateApplied: Date;
  takeDown: boolean;
  targetUri: string;
  takedownSuccess?: boolean | undefined;
}): string => {
  const {
    did,
    pds,
    label,
    labeler,
    negated,
    dateApplied,
    takeDown,
    targetUri,
    takedownSuccess,
  } = params;

  let info = [
    `A label event was detected.`,
    ``,
    `DID:      ${did}`,
    `PDS:      ${pds}`,
    `Label:    ${label}`,
    `Labeler:  ${labeler}`,
    `Negated:  ${negated}`,
    `Date:     ${dateApplied.toISOString()}`,
    `Target:   ${targetUri}`,
  ];

  if (takeDown) {
    if (takedownSuccess === undefined) {
      info.push(
        `Takedown action configured but not attempted (admin password not set).`,
      );
    } else if (takedownSuccess) {
      info.push(
        negated
          ? `Takedown reversed successfully.`
          : `Takedown issued successfully.`,
      );
    } else {
      info.push(
        negated
          ? `Failed to reverse takedown — manual action required.`
          : `Failed to issue takedown — manual action required.`,
      );
    }
  }

  return info.join("\n");
}

export const sendNewAccountNotification = async (
  emails: string[],
  params: {
    did: string;
    pds: string;
  }
) => {
  const {
    did,
    pds
  } = params;

  logger.info(`Sending new account notification for ${did} on ${pds}...`)

  const subject = `New account created on ${pds} - ${did}`;
  let infoText = [
    `A new account has been detected on ${pds}.`,
    ``,
    `DID:      ${did}`,
    `PDS:      ${pds}`
  ];
  const text = infoText.join("\n");

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
}

export const sendLabelNotification = async (
  emails: string[],
  params: {
    did: string;
    pds: string;
    label: string;
    labeler: string;
    negated: boolean;
    dateApplied: Date;
    takeDown: boolean;
    targetUri: string;
    takedownSuccess?: boolean | undefined;
  },
) => {
  const {
    did,
    pds,
    label,
    negated,
  } = params;

  const subject = `Label "${label}" ${negated ? "negated" : "applied"} — ${did} - ${pds}`;
  const text = getInfoFromParams(params);

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

export const sendAccountDigest = async (
  emails: string[],
  pds: string,
  repos: {
    did: string;
    pdsHost: string;
    dateFound: Date;  
  }[]
) => {
  const reportDate = new Date().toLocaleDateString();
  const subject = `Daily account digest for ${pds} - ${reportDate}`

  const infoText = [
    `Please see below report of accounts identified on ${pds} in the last 24 hours.`,
    ``,
  ];
  
  for (const repo of repos) {
    infoText.push(`DID: ${repo.did}`)
    infoText.push(`Date Found: ${repo.dateFound.toLocaleString()}`)
    infoText.push(``)
  }

  const text = infoText.join("\n");

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
}
