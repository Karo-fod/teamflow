import nodemailer from "nodemailer";

let transporter = null;

function getSmtpConfig() {
  const { SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

  if (!SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    throw new Error(
      `Email SMTP configuration is missing: ${[
        !SMTP_USER && "SMTP_USER",
        !SMTP_PASS && "SMTP_PASS",
        !MAIL_FROM && "MAIL_FROM",
      ]
        .filter(Boolean)
        .join(", ")}`
    );
  }

  return { SMTP_USER, SMTP_PASS, MAIL_FROM };
}

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_USER, SMTP_PASS } = getSmtpConfig();
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE } = process.env;
  const auth = { user: SMTP_USER, pass: SMTP_PASS };

  // Any SMTP provider when SMTP_HOST is set, otherwise Gmail.
  transporter = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: SMTP_SECURE === "true",
        auth,
      })
    : nodemailer.createTransport({ service: "gmail", auth });

  return transporter;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

const oneLine = (value) => String(value).replace(/[\r\n]+/g, " ").trim();

export function buildInvitationEmail({
  inviterName,
  workspaceName,
  role,
  invitationUrl,
  expiresAt,
}) {
  const roleLabel = role === "admin" ? "an admin" : "a member";
  const expires = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const subject = `You're invited to join ${oneLine(workspaceName)} on TeamFlow`;

  const text = [
    `${oneLine(inviterName)} invited you to join "${oneLine(workspaceName)}" on TeamFlow as ${roleLabel}.`,
    "",
    `Accept your invitation: ${invitationUrl}`,
    "",
    expires ? `This link expires on ${expires}.` : "",
    "If you weren't expecting this, you can ignore this email.",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f9;font-family:Arial,Helvetica,sans-serif;color:#1a1d2e;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 4px;font-size:20px;font-weight:bold;"><span style="color:#6366f1;">Team</span>Flow</p>
            <h1 style="margin:24px 0 12px;font-size:20px;">You're invited to ${escapeHtml(oneLine(workspaceName))}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">
              <strong>${escapeHtml(oneLine(inviterName))}</strong> invited you to join
              <strong>${escapeHtml(oneLine(workspaceName))}</strong> as ${roleLabel}.
            </p>
            <p style="margin:0 0 24px;">
              <a href="${escapeHtml(invitationUrl)}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">Accept invitation</a>
            </p>
            <p style="margin:0 0 8px;font-size:13px;color:#555b73;">Or paste this link into your browser:<br><span style="word-break:break-all;">${escapeHtml(invitationUrl)}</span></p>
            <p style="margin:16px 0 0;font-size:12px;color:#8a8fa6;">${
              expires ? `This invitation expires on ${escapeHtml(expires)}. ` : ""
            }If you weren't expecting it, you can ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export async function sendWorkspaceInvitation({
  to,
  inviterName,
  workspaceName,
  role,
  token,
  expiresAt,
}) {
  const { MAIL_FROM } = getSmtpConfig();
  const { CLIENT_URL } = process.env;

  if (!CLIENT_URL) {
    throw new Error("CLIENT_URL is missing.");
  }

  const invitationUrl = new URL("/accept-invitation", CLIENT_URL);
  invitationUrl.searchParams.set("token", token);

  const { subject, text, html } = buildInvitationEmail({
    inviterName,
    workspaceName,
    role,
    invitationUrl: invitationUrl.toString(),
    expiresAt,
  });

  await getTransporter().sendMail({ from: MAIL_FROM, to, subject, text, html });
}

export async function verifyEmailConnection() {
  getSmtpConfig();
  await getTransporter().verify();
}
