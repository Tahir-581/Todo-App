import { DailyEmailReportKind } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function reportKindLabel(kind: DailyEmailReportKind): string {
  switch (kind) {
    case DailyEmailReportKind.PROGRESS_TRACKER:
      return "Progress tracker";
    case DailyEmailReportKind.ALL_TASKS:
      return "All tasks";
    case DailyEmailReportKind.ALL_REPORTS:
      return "All reports";
    default:
      return "Daily report";
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const take = 200;

  const [emailLogs, whatsAppLogs, user] = await Promise.all([
    prisma.progressDailyReportLog.findMany({
      where: { userId: session.user.id },
      orderBy: { sentAt: "desc" },
      take,
      select: { id: true, dateStr: true, sentAt: true },
    }),
    prisma.progressDailyReportWhatsAppLog.findMany({
      where: { userId: session.user.id },
      orderBy: { sentAt: "desc" },
      take,
      select: { id: true, dateStr: true, sentAt: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        dailyEmailReportKind: true,
        dailyProgressEmail: true,
        dailyProgressWhatsApp: true,
        emailNotifications: true,
        whatsappNotifications: true,
      },
    }),
  ]);

  const items = [
    ...emailLogs.map((row) => ({
      key: `email:${row.id}` as const,
      channel: "email" as const,
      title: "Daily progress email",
      summary: `Report for ${row.dateStr}`,
      dateStr: row.dateStr,
      sentAt: row.sentAt.toISOString(),
    })),
    ...whatsAppLogs.map((row) => ({
      key: `whatsapp:${row.id}` as const,
      channel: "whatsapp" as const,
      title: "Daily progress WhatsApp",
      summary: `Report for ${row.dateStr}`,
      dateStr: row.dateStr,
      sentAt: row.sentAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return NextResponse.json({
    items,
    stats: {
      emailTotal: emailLogs.length,
      whatsAppTotal: whatsAppLogs.length,
    },
    settingsHint: user
      ? {
          reportKindLabel: reportKindLabel(user.dailyEmailReportKind),
          dailyProgressEmail: user.dailyProgressEmail && user.emailNotifications,
          dailyProgressWhatsApp: user.dailyProgressWhatsApp && user.whatsappNotifications,
        }
      : null,
  });
}
