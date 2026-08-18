import { getSession } from "@/lib/auth";
import { deadlineReminderHtml, isEmailDeliveryConfigured, sendRawEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

/** Sends "due tomorrow" emails for the signed-in user's tasks (idempotent per task). */
export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailNotifications) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skippedReason: "email_notifications_disabled" as const,
    });
  }
  if (!isEmailDeliveryConfigured()) {
    console.error("[reminders/check] No email transport: set RESEND_API_KEY or SMTP_* in .env");
    return NextResponse.json({
      ok: false,
      sent: 0,
      candidates: 0,
      error: "email_not_configured",
      hint: "Use RESEND_API_KEY (HTTPS) if SMTP port 587 is blocked on your network.",
    });
  }
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const tomorrowEnd = endOfDay(tomorrow);
  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      status: { notIn: ["DONE", "TODAY_DONE", "CANCELLED"] },
      deadline: { gte: tomorrow, lte: tomorrowEnd },
      deadlineReminderSentAt: null,
    },
  });
  let sent = 0;
  const errors: string[] = [];
  for (const t of tasks) {
    try {
      await sendRawEmail({
        to: user.email,
        subject: `Due tomorrow: ${t.title}`,
        html: deadlineReminderHtml({
          taskTitle: t.title,
          deadline: t.deadline ? format(t.deadline, "PPpp") : "",
        }),
      });
      await prisma.task.update({
        where: { id: t.id },
        data: { deadlineReminderSentAt: new Date() },
      });
      sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reminders/check] send failed for task", t.id, msg);
      errors.push(msg);
    }
  }
  return NextResponse.json({
    ok: true,
    sent,
    candidates: tasks.length,
    sendFailed: errors.length,
    ...(process.env.NODE_ENV === "development" && errors.length ? { errors } : {}),
  });
}
