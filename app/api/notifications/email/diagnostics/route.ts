import { getSession } from "@/lib/auth";
import {
  getResendEnvStatus,
  getSmtpEnvStatus,
  verifyResendConnection,
  verifySmtpConnection,
} from "@/lib/email";
import { NextResponse } from "next/server";

/**
 * Authenticated email diagnostics: Resend (HTTPS) + SMTP env and verify.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = getResendEnvStatus();
  const smtp = getSmtpEnvStatus();

  const resendVerify = resend.configured
    ? await verifyResendConnection()
    : ({ ok: false as const, message: "Not configured" });
  const smtpVerify = smtp.configured
    ? await verifySmtpConnection()
    : ({ ok: false as const, message: "Not configured" });

  const activeProvider = resend.configured ? "resend" : smtp.configured ? "smtp" : "none";

  return NextResponse.json({
    activeProvider,
    resend: {
      configured: resend.configured,
      from: resend.from,
      verify: resendVerify.ok ? { ok: true } : { ok: false, message: resendVerify.message },
    },
    smtp: {
      configured: smtp.configured,
      missing: smtp.missing,
      host: smtp.host,
      port: smtp.port,
      likelyEthereal: smtp.likelyEthereal,
      verify: smtpVerify.ok ? { ok: true } : { ok: false, message: smtpVerify.message },
    },
    hints: [
      resend.configured && resendVerify.ok
        ? "Resend is active (HTTPS / port 443). Email should work even when SMTP is blocked."
        : null,
      !resend.configured && smtp.configured && !smtpVerify.ok
        ? "SMTP failed (often ETIMEDOUT = port 587 blocked). Add RESEND_API_KEY from https://resend.com — it sends over HTTPS and bypasses SMTP firewall rules."
        : null,
      smtp.likelyEthereal && !resend.configured
        ? "Ethereal does not deliver to your real inbox; use the preview URL. For real delivery, use Resend or another provider."
        : null,
      !resend.configured && !smtp.configured
        ? "Set RESEND_API_KEY (recommended if SMTP is blocked) or SMTP_HOST, SMTP_USER, SMTP_PASS."
        : null,
    ].filter(Boolean),
  });
}
