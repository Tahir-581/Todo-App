import { getSession } from "@/lib/auth";
import { normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";
import { prisma } from "@/lib/prisma";
import {
  calendarTodayYmd,
  getEffectiveReportTimeZone,
  localMinutesSinceMidnight,
} from "@/lib/reportTimeZone";

/**
 * Server-side digest time gate (same math as `/api/cron/progress-tracker/daily-report`).
 * Use this in the UI so users see why a scheduled send has not fired yet.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      dailyReportSendMinutes: true,
      reportTzOffsetMinutes: true,
      reportTimeZone: true,
    },
  });
  if (!u) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const timeZone = getEffectiveReportTimeZone(u);
  const scheduledMinutesList = normalizeDailyReportSendMinutes(u.dailyReportSendMinutes);
  const localMinutes = localMinutesSinceMidnight(timeZone);
  const todayStr = calendarTodayYmd(timeZone);

  const waLogs =
    scheduledMinutesList.length > 0
      ? await prisma.progressDailyReportWhatsAppLog.findMany({
          where: {
            userId: session.user.id,
            dateStr: todayStr,
            slotMinutes: { in: scheduledMinutesList },
          },
          select: { slotMinutes: true },
        })
      : [];
  const waLogged = new Set(waLogs.map((r) => r.slotMinutes));

  const slots = scheduledMinutesList.map((minutes) => ({
    minutes,
    digestReady: localMinutes >= minutes,
    whatsappDigestLogged: waLogged.has(minutes),
  }));

  return Response.json({
    timeZone,
    todayLocal: todayStr,
    localMinutes,
    scheduledMinutesList,
    /** @deprecated use `slots` */
    scheduledMins: scheduledMinutesList[0] ?? 540,
    digestReady: slots.some((s) => s.digestReady),
    slots,
    whatsappDigestLoggedToday: slots.some((s) => s.whatsappDigestLogged),
  });
}
