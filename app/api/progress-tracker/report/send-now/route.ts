import { DailyEmailReportKind } from "@prisma/client";
import { getSession } from "@/lib/auth";
import {
  buildComposedDailyEmail,
  fetchTasksForDailyEmail,
  type UserRowForDailyEmail,
} from "@/lib/dailyEmailForUser";
import { DAILY_REPORT_SEND_NOW_SLOT_MINUTES } from "@/lib/dailyReportSchedule";
import { isEmailDeliveryConfigured, sendRawEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Sends the configured daily email immediately (same content as the scheduled job).
 */
export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailDeliveryConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "email_not_configured",
        hint: "Set RESEND_API_KEY or SMTP_* in your environment.",
      },
      { status: 500 }
    );
  }

  const raw = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      emailNotifications: true,
      dailyProgressEmail: true,
      dailyEmailReportKind: true,
      dailyReportSendMinutes: true,
      reportTzOffsetMinutes: true,
      reportTimeZone: true,
      progressTrackerState: true,
      notificationRecipients: { select: { email: true } },
    },
  });

  if (!raw?.emailNotifications || !raw.dailyProgressEmail) {
    return NextResponse.json(
      { error: "Enable email notifications and the daily email report in Settings." },
      { status: 400 }
    );
  }

  const u = { id: session.user.id, ...raw } as UserRowForDailyEmail;

  if (u.dailyEmailReportKind === DailyEmailReportKind.PROGRESS_TRACKER && !u.progressTrackerState) {
    return NextResponse.json(
      {
        error: "No synced tracker data",
        hint: "Open the Progress Tracker page once so your habits sync to the server.",
      },
      { status: 400 }
    );
  }

  const needTasks =
    u.dailyEmailReportKind === DailyEmailReportKind.ALL_TASKS ||
    u.dailyEmailReportKind === DailyEmailReportKind.ALL_REPORTS;
  const tasks = needTasks ? await fetchTasksForDailyEmail(u.id, u.dailyEmailReportKind) : [];

  const built = buildComposedDailyEmail(u, tasks, { enforceScheduledTime: false });
  if (built.kind !== "ok") {
    return NextResponse.json({ error: "Could not build email" }, { status: 500 });
  }

  const { html, subject, reportDateStr, asOfFormatted, timeZone } = built;

  const recipients = [u.email, ...u.notificationRecipients.map((r) => r.email)].filter(Boolean);

  try {
    for (const to of recipients) {
      await sendRawEmail({ to, subject, html });
    }
    await prisma.progressDailyReportLog.upsert({
      where: {
        userId_dateStr_slotMinutes: {
          userId: session.user.id,
          dateStr: reportDateStr,
          slotMinutes: DAILY_REPORT_SEND_NOW_SLOT_MINUTES,
        },
      },
      create: {
        userId: session.user.id,
        dateStr: reportDateStr,
        slotMinutes: DAILY_REPORT_SEND_NOW_SLOT_MINUTES,
      },
      update: {},
    });
    return NextResponse.json({
      ok: true,
      reportDateStr,
      subject,
      recipientCount: recipients.length,
      asOf: asOfFormatted,
      timeZone,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[progress-tracker/report/send-now]", msg);
    return NextResponse.json(
      {
        error: "Email failed",
        ...(process.env.NODE_ENV === "development" ? { detail: msg } : {}),
      },
      { status: 500 }
    );
  }
}
