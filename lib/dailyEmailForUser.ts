import { DailyEmailReportKind, TaskStatus, type TaskPriority } from "@prisma/client";
import { composeDailyEmail, type TaskForDailyEmail } from "@/lib/dailyEmailComposer";
import { composeDailyWhatsAppText } from "@/lib/dailyWhatsAppComposer";
import { prisma } from "@/lib/prisma";
import { earliestDailyReportSendMinute, normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";
import {
  calendarYesterdayYmd,
  formatNowInZone,
  formatYmdLongInZone,
  getEffectiveReportTimeZone,
  localMinutesSinceMidnight,
} from "@/lib/reportTimeZone";

export type UserRowForDailyEmail = {
  id: string;
  email: string;
  dailyEmailReportKind: DailyEmailReportKind;
  /** Local send times (minutes since midnight); used for schedule gating when enforced. */
  dailyReportSendMinutes: number[];
  reportTzOffsetMinutes: number;
  reportTimeZone: string | null;
  progressTrackerState: null | {
    activitiesJson: string;
    checksJson: string;
    tzOffsetMinutes: number;
  };
  notificationRecipients: { email: string }[];
};

export function skipReasonForDailyEmail(u: UserRowForDailyEmail): "no_progress_state" | null {
  if (u.dailyEmailReportKind === DailyEmailReportKind.PROGRESS_TRACKER && !u.progressTrackerState) {
    return "no_progress_state";
  }
  return null;
}

export async function fetchTasksForDailyEmail(
  userId: string,
  reportKind: DailyEmailReportKind
): Promise<TaskForDailyEmail[]> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(reportKind === DailyEmailReportKind.ALL_TASKS
        ? { status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.TODAY_DONE] } }
        : {}),
    },
    orderBy: [{ status: "asc" }, { taskRef: "asc" }],
    select: {
      title: true,
      status: true,
      priority: true,
      deadline: true,
      description: true,
      project: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" }, select: { content: true } },
    },
  });
  return tasks;
}

export function buildComposedDailyEmail(
  u: UserRowForDailyEmail,
  tasks: TaskForDailyEmail[],
  opts: { enforceScheduledTime?: boolean; scheduledSlotMinutes?: number }
) {
  const timeZone = getEffectiveReportTimeZone(u);
  if (opts.enforceScheduledTime) {
    const localMinutes = localMinutesSinceMidnight(timeZone);
    const slot =
      typeof opts.scheduledSlotMinutes === "number"
        ? opts.scheduledSlotMinutes
        : earliestDailyReportSendMinute(normalizeDailyReportSendMinutes(u.dailyReportSendMinutes));
    if (localMinutes < slot) {
      return { kind: "too_early" as const };
    }
  }

  const reportDateStr = calendarYesterdayYmd(timeZone);
  const yesterdayLabel = formatYmdLongInZone(reportDateStr, timeZone);
  const asOfFormatted = formatNowInZone(timeZone);

  const state = u.progressTrackerState;
  const htmlBundle = composeDailyEmail({
    kind: u.dailyEmailReportKind,
    timeZone,
    reportDateStr,
    yesterdayLabel,
    asOfFormatted,
    activitiesJson: state?.activitiesJson ?? null,
    checksJson: state?.checksJson ?? null,
    tasks,
  });
  return { kind: "ok" as const, timeZone, asOfFormatted, ...htmlBundle };
}

export function buildComposedDailyWhatsApp(
  u: UserRowForDailyEmail,
  tasks: TaskForDailyEmail[],
  opts: { enforceScheduledTime?: boolean; scheduledSlotMinutes?: number }
) {
  const timeZone = getEffectiveReportTimeZone(u);
  if (opts.enforceScheduledTime) {
    const localMinutes = localMinutesSinceMidnight(timeZone);
    const slot =
      typeof opts.scheduledSlotMinutes === "number"
        ? opts.scheduledSlotMinutes
        : earliestDailyReportSendMinute(normalizeDailyReportSendMinutes(u.dailyReportSendMinutes));
    if (localMinutes < slot) {
      return { kind: "too_early" as const };
    }
  }

  const reportDateStr = calendarYesterdayYmd(timeZone);
  const yesterdayLabel = formatYmdLongInZone(reportDateStr, timeZone);
  const asOfFormatted = formatNowInZone(timeZone);

  const state = u.progressTrackerState;
  const textBundle = composeDailyWhatsAppText({
    kind: u.dailyEmailReportKind,
    timeZone,
    reportDateStr,
    yesterdayLabel,
    asOfFormatted,
    activitiesJson: state?.activitiesJson ?? null,
    checksJson: state?.checksJson ?? null,
    tasks,
  });
  return { kind: "ok" as const, timeZone, asOfFormatted, ...textBundle };
}

export { type TaskForDailyEmail, type TaskPriority, TaskStatus };
