import dns from "node:dns";
import nodemailer from "nodemailer";

/** Prefer IPv4 first on Windows/dual-stack networks to avoid flaky IPv6 SMTP paths. */
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

/** Strip CRLF, BOM, and surrounding quotes that break DNS (common in .env on Windows). */
function normalizeSmtpField(v: string): string {
  return v
    .replace(/\uFEFF/g, "")
    .replace(/\r/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function readSmtpHost(): string | undefined {
  const raw = process.env.SMTP_HOST;
  if (raw == null || raw === "") return undefined;
  const h = normalizeSmtpField(raw);
  return h || undefined;
}

function readSmtpUser(): string | undefined {
  const raw = process.env.SMTP_USER;
  if (raw == null || raw === "") return undefined;
  const u = normalizeSmtpField(raw);
  return u || undefined;
}

function readSmtpPass(): string | undefined {
  const raw = process.env.SMTP_PASS;
  if (raw == null || raw === "") return undefined;
  const p = normalizeSmtpField(raw).replace(/\s+/g, "");
  return p || undefined;
}

/** From header: EMAIL_FROM, then SMTP_FROM, then default. */
export function getMailFrom(): string {
  const emailFrom = process.env.EMAIL_FROM?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim();
  return emailFrom || smtpFrom || "Tasks <noreply@localhost>";
}

function getTransport() {
  const host = readSmtpHost();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = readSmtpUser();
  const pass = readSmtpPass();
  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function isTransientSmtpFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ESOCKETTIMEDOUT|ECONNREFUSED/i.test(msg);
}

async function sendMailWithTransientRetry(
  transport: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  maxAttempts = 3
): Promise<nodemailer.SentMessageInfo> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await transport.sendMail(mailOptions);
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts - 1 && isTransientSmtpFailure(e)) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export type SmtpEnvStatus = {
  configured: boolean;
  missing: string[];
  host?: string;
  port: number;
  from: string;
  /** Ethereal and similar do not deliver to real inboxes; nodemailer returns a preview URL instead. */
  likelyEthereal: boolean;
};

export function getSmtpEnvStatus(): SmtpEnvStatus {
  const host = readSmtpHost();
  const user = readSmtpUser();
  const pass = readSmtpPass();
  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  const port = Number(process.env.SMTP_PORT || 587);
  const from = getMailFrom();
  const likelyEthereal = Boolean(host?.toLowerCase().includes("ethereal"));
  return {
    configured: missing.length === 0,
    missing,
    host: host || undefined,
    port,
    from,
    likelyEthereal,
  };
}

export async function verifySmtpConnection(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const status = getSmtpEnvStatus();
  if (!status.configured) {
    return { ok: false, message: `Missing environment variables: ${status.missing.join(", ")}` };
  }
  try {
    const transport = getTransport();
    await transport.verify();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

export type ResendEnvStatus = {
  configured: boolean;
  /** Effective From header when using Resend */
  from: string;
};

export function getResendEnvStatus(): ResendEnvStatus {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Tasks <onboarding@resend.dev>";
  return { configured: Boolean(key), from };
}

export async function verifyResendConnection(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, message: "RESEND_API_KEY not set" };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { ok: true };
    const text = await res.text();
    return { ok: false, message: `${res.status} ${text.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/** True if either Resend (HTTPS) or SMTP env is set. Sending prefers Resend when the key is present. */
export function isEmailDeliveryConfigured(): boolean {
  return getResendEnvStatus().configured || getSmtpEnvStatus().configured;
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ provider: "resend" }> {
  const key = process.env.RESEND_API_KEY!.trim();
  const { from } = getResendEnvStatus();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    let msg = bodyText;
    try {
      const j = JSON.parse(bodyText) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* use raw */
    }
    throw new Error(`Resend: ${res.status} ${msg}`);
  }
  console.log("[email] sent via Resend (HTTPS, port 443)");
  return { provider: "resend" };
}

export async function sendRawEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ previewUrl?: string; provider: "resend" | "smtp" }> {
  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(opts);
  }

  const from = getMailFrom();
  const transport = getTransport();
  const info = await sendMailWithTransientRetry(transport, {
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  const rawPreview = nodemailer.getTestMessageUrl(info);
  const previewUrl = typeof rawPreview === "string" ? rawPreview : undefined;
  if (previewUrl) {
    console.log("[email] Preview URL (Ethereal / test inbox):", previewUrl);
  }
  return { previewUrl, provider: "smtp" };
}

export function completionEmailHtml(params: {
  taskTitle: string;
  completedAt: string;
  notes: string;
  comments?: { author: string; at: string; content: string }[];
  imageAttachments?: { name: string; url: string }[];
}) {
  const imageUrlRe = /\.(jpe?g|png|gif|webp)(\?|#|$)/i;
  const imageAttachments = (params.imageAttachments ?? []).filter((a) => {
    const u = (a.url || "").trim();
    const n = (a.name || "").trim();
    return u.startsWith("data:image/") || imageUrlRe.test(u) || imageUrlRe.test(n);
  });
  const imagePreviewHtml =
    imageAttachments.length > 0
      ? `<div style="margin-top:16px;padding:16px;background:#0D0D0F;border-radius:8px;border:1px solid #27272a;">
      <p style="margin:0 0 10px;font-size:12px;color:#71717a;">Images</p>
      ${imageAttachments
        .slice(0, 3)
        .map(
          (a) => `<div style="margin-top:10px;">
        <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
          <img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name || "Task image")}" style="display:block;max-width:100%;height:auto;border-radius:8px;border:1px solid #27272a;" />
        </a>
      </div>`
        )
        .join("")}
      ${
        imageAttachments.length > 3
          ? `<p style="margin:10px 0 0;font-size:12px;color:#71717a;">+${imageAttachments.length - 3} more image(s)</p>`
          : ""
      }
    </div>`
      : "";

  const commentsHtml =
    params.comments?.length ?
      `<div style="margin-top:16px;padding:16px;background:#0D0D0F;border-radius:8px;border:1px solid #27272a;">
      <p style="margin:0 0 12px;font-size:12px;color:#71717a;">Comments</p>
      ${params.comments
        .map(
          (c, i) => `<div style="margin-top:${i ? 12 : 0}px;padding-top:${i ? 12 : 0}px;${i ? "border-top:1px solid #27272a;" : ""}">
        <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;"><strong style="color:#e4e4e7;">${escapeHtml(c.author)}</strong> · ${escapeHtml(c.at)}</p>
        <p style="margin:0 0 6px;font-size:12px;color:#71717a;">Comment</p>
        <p style="margin:0;white-space:pre-wrap;color:#e4e4e7;">${escapeHtml(c.content)}</p>
      </div>`
        )
        .join("")}
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0D0D0F;color:#e4e4e7;font-family:system-ui,sans-serif;padding:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#161618;border-radius:12px;border:1px solid #27272a;overflow:hidden;">
    <tr><td style="padding:28px 28px 8px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6366F1;">Task completed</p>
      <h1 style="margin:12px 0 0;font-size:22px;font-weight:600;color:#fafafa;">${escapeHtml(params.taskTitle)}</h1>
    </td></tr>
    <tr><td style="padding:8px 28px 24px;color:#a1a1aa;font-size:14px;line-height:1.6;">
      <p style="margin:0 0 12px;">Completed at <strong style="color:#e4e4e7;">${escapeHtml(params.completedAt)}</strong></p>
      ${params.notes ? `<div style="margin-top:16px;padding:16px;background:#0D0D0F;border-radius:8px;border:1px solid #27272a;"><p style="margin:0 0 8px;font-size:12px;color:#71717a;">Description</p><p style="margin:0;white-space:pre-wrap;">${escapeHtml(params.notes)}</p></div>` : ""}
      ${imagePreviewHtml}
      ${commentsHtml}
    </td></tr>
    <tr><td style="padding:16px 28px 28px;border-top:1px solid #27272a;color:#52525b;font-size:12px;">Sent by your task workspace</td></tr>
  </table>
</body>
</html>`;
}

export function deadlineReminderHtml(params: { taskTitle: string; deadline: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0D0D0F;color:#e4e4e7;font-family:system-ui,sans-serif;padding:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#161618;border-radius:12px;border:1px solid #27272a;">
    <tr><td style="padding:28px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#f59e0b;">Due tomorrow</p>
      <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;">${escapeHtml(params.taskTitle)}</h1>
      <p style="margin:16px 0 0;color:#a1a1aa;font-size:14px;">Deadline: <strong style="color:#fafafa;">${escapeHtml(params.deadline)}</strong></p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function passwordResetHtml(params: { name: string; url: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0D0D0F;color:#e4e4e7;font-family:system-ui,sans-serif;padding:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#161618;border-radius:12px;border:1px solid #27272a;">
    <tr><td style="padding:28px;">
      <h1 style="margin:0;font-size:20px;">Reset your password</h1>
      <p style="margin:16px 0;color:#a1a1aa;font-size:14px;">Hi ${escapeHtml(params.name || "there")}, click the link below to set a new password. This link expires in one hour.</p>
      <p style="margin:24px 0;"><a href="${params.url}" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Reset password</a></p>
      <p style="margin:0;color:#52525b;font-size:12px;word-break:break-all;">${escapeHtml(params.url)}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function dailyEmailDocument(rowsHtml: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0D0D0F;color:#e4e4e7;font-family:system-ui,sans-serif;padding:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
    ${rowsHtml}
  </table>
</body>
</html>`;
}

/** Single card: progress tracker day summary (yesterday). */
export function progressDailyReportCardHtml(params: {
  sectionEyebrow?: string;
  dateLabel: string;
  overviewLine: string;
  items: { name: string; checked: boolean; color: string; streak: number }[];
  footerLine: string;
}) {
  const eyebrow = params.sectionEyebrow ?? "Daily progress report";
  const rows = params.items
    .map((it) => {
      const pillBg = it.checked ? it.color : "rgba(255,255,255,0.06)";
      const pillText = it.checked ? "#ffffff" : "#a1a1aa";
      const status = it.checked ? "Done" : "Missed";
      const streak = it.streak > 0 ? ` · 🔥 ${it.streak}d` : "";
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #27272a;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="min-width:0;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${escapeHtml(
                    it.color
                  )};"></span>
                  <span style="font-size:14px;color:#e4e4e7;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px;">${escapeHtml(
                    it.name
                  )}</span>
                </div>
                <div style="margin-top:4px;font-size:12px;color:#71717a;">${escapeHtml(
                  status
                )}${streak}</div>
              </div>
              <span style="flex:0 0 auto;display:inline-block;padding:6px 10px;border-radius:999px;background:${pillBg};color:${pillText};font-size:12px;font-weight:700;">
                ${it.checked ? "✓" : "–"}
              </span>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return `
  <tr><td style="padding-bottom:16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#161618;border-radius:14px;border:1px solid #27272a;overflow:hidden;">
      <tr><td style="padding:28px 28px 10px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#14b8a6;">${escapeHtml(
          eyebrow
        )}</p>
        <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;color:#fafafa;">${escapeHtml(params.dateLabel)}</h1>
        <p style="margin:12px 0 0;color:#a1a1aa;font-size:14px;line-height:1.6;">${escapeHtml(
          params.overviewLine
        )}</p>
      </td></tr>
      <tr><td style="padding:10px 28px 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rows || `<tr><td style="padding:14px 0;color:#71717a;">No activities yet.</td></tr>`}
        </table>
      </td></tr>
      <tr><td style="padding:18px 28px 26px;border-top:1px solid #27272a;color:#52525b;font-size:12px;">
        ${escapeHtml(params.footerLine)}
      </td></tr>
    </table>
  </td></tr>`;
}

export function progressDailyReportHtml(params: {
  dateLabel: string;
  overviewLine: string;
  items: { name: string; checked: boolean; color: string; streak: number }[];
  footerLine: string;
}) {
  return dailyEmailDocument(progressDailyReportCardHtml(params));
}

export type TaskSnapshotRow = {
  title: string;
  statusLabel: string;
  projectName: string;
  priorityLabel: string;
  deadlineLabel: string;
};

/** Card: all tasks with status (grouped). */
export function allTasksReportCardHtml(params: {
  sectionEyebrow?: string;
  asOfLabel: string;
  summaryLine: string;
  groups: { statusLabel: string; tasks: TaskSnapshotRow[] }[];
  footerLine?: string;
}) {
  const eyebrow = params.sectionEyebrow ?? "All tasks";
  const groupBlocks =
    params.groups.length === 0
      ? `<tr><td style="padding:14px 0;color:#71717a;font-size:14px;">No tasks yet.</td></tr>`
      : params.groups
    .map((g) => {
      const taskRows =
        g.tasks.length === 0
          ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px;">No tasks in this status.</td></tr>`
          : g.tasks
              .map(
                (t) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #27272a;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#fafafa;">${escapeHtml(t.title)}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;">
              <span style="color:#818cf8;">${escapeHtml(t.statusLabel)}</span>
              ${t.projectName ? ` · ${escapeHtml(t.projectName)}` : ""}
              ${t.priorityLabel !== "None" ? ` · ${escapeHtml(t.priorityLabel)}` : ""}
              ${t.deadlineLabel ? ` · Due ${escapeHtml(t.deadlineLabel)}` : ""}
            </p>
          </td>
        </tr>`
              )
              .join("");
      return `
        <tr><td style="padding:16px 0 8px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#71717a;">${escapeHtml(
            g.statusLabel
          )}</p>
        </td></tr>
        ${taskRows}`;
    })
    .join("");

  const footer = params.footerLine ?? "Task list from your workspace.";

  return `
  <tr><td style="padding-bottom:16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#161618;border-radius:14px;border:1px solid #27272a;overflow:hidden;">
      <tr><td style="padding:28px 28px 10px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6366F1;">${escapeHtml(
          eyebrow
        )}</p>
        <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;color:#fafafa;">Snapshot</h1>
        <p style="margin:12px 0 0;color:#a1a1aa;font-size:14px;line-height:1.6;">${escapeHtml(
          params.asOfLabel
        )}</p>
        <p style="margin:8px 0 0;color:#a1a1aa;font-size:13px;">${escapeHtml(params.summaryLine)}</p>
      </td></tr>
      <tr><td style="padding:10px 28px 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${groupBlocks || `<tr><td style="padding:14px 0;color:#71717a;">No tasks yet.</td></tr>`}
        </table>
      </td></tr>
      <tr><td style="padding:18px 28px 26px;border-top:1px solid #27272a;color:#52525b;font-size:12px;">
        ${escapeHtml(footer)}
      </td></tr>
    </table>
  </td></tr>`;
}

export function combinedDailyReportIntroRow(params: { title: string; subtitle: string }) {
  return `
  <tr><td style="padding:0 0 20px;">
    <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">${escapeHtml(
      params.title
    )}</p>
    <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#fafafa;">Daily report</h1>
    <p style="margin:10px 0 0;color:#a1a1aa;font-size:14px;line-height:1.5;">${escapeHtml(params.subtitle)}</p>
  </td></tr>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
