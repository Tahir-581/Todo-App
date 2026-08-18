import { DailyEmailReportKind, TaskPriority, TaskStatus } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import {
  allTasksReportCardHtml,
  combinedDailyReportIntroRow,
  dailyEmailDocument,
  progressDailyReportCardHtml,
  type TaskSnapshotRow,
} from "@/lib/email";
import { getProgressTrackerReportPayload } from "@/lib/progressDailyReport";

const STATUS_ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.TODAY_DONE,
  TaskStatus.DONE,
  TaskStatus.CANCELLED,
];

function statusLabel(s: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "To do",
    [TaskStatus.IN_PROGRESS]: "In progress",
    [TaskStatus.IN_REVIEW]: "In review",
    [TaskStatus.TODAY_DONE]: "Today done",
    [TaskStatus.DONE]: "Done",
    [TaskStatus.CANCELLED]: "Cancelled",
  };
  return map[s] ?? s;
}

function priorityLabel(p: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    [TaskPriority.NONE]: "None",
    [TaskPriority.LOW]: "Low",
    [TaskPriority.MEDIUM]: "Medium",
    [TaskPriority.HIGH]: "High",
    [TaskPriority.URGENT]: "Urgent",
  };
  return map[p] ?? p;
}

export type TaskForDailyEmail = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | null;
  project: { name: string } | null;
  /** Plain text / HTML from task body — used for WhatsApp daily digest detail lines. */
  description: string;
  /** Task comments, oldest first — used for WhatsApp daily digest. */
  comments: { content: string }[];
};

function mapTasksToGroups(
  tasks: TaskForDailyEmail[],
  timeZone: string
): { statusLabel: string; tasks: TaskSnapshotRow[] }[] {
  const byStatus = new Map<TaskStatus, TaskForDailyEmail[]>();
  for (const s of STATUS_ORDER) byStatus.set(s, []);
  for (const t of tasks) {
    const list = byStatus.get(t.status);
    if (list) list.push(t);
    else byStatus.set(t.status, [t]);
  }
  return STATUS_ORDER.map((st) => ({
    statusLabel: statusLabel(st),
    tasks: (byStatus.get(st) ?? []).map((t) => ({
      title: t.title,
      statusLabel: statusLabel(t.status),
      projectName: t.project?.name ?? "",
      priorityLabel: priorityLabel(t.priority),
      deadlineLabel: t.deadline ? formatInTimeZone(t.deadline, timeZone, "PP") : "",
    })),
  }));
}

function emptyProgressCard(message: string) {
  return progressDailyReportCardHtml({
    sectionEyebrow: "Progress tracker",
    dateLabel: "—",
    overviewLine: message,
    items: [],
    footerLine: "Open the Progress page while signed in to sync your tracker.",
  });
}

export function composeDailyEmail(params: {
  kind: DailyEmailReportKind;
  timeZone: string;
  reportDateStr: string;
  yesterdayLabel: string;
  asOfFormatted: string;
  activitiesJson: string | null;
  checksJson: string | null;
  tasks: TaskForDailyEmail[];
}): { html: string; subject: string; reportDateStr: string } {
  const asOfLine = `As of ${params.asOfFormatted}.`;

  const progressPayload =
    params.activitiesJson != null && params.checksJson != null
      ? getProgressTrackerReportPayload(
          params.reportDateStr,
          params.yesterdayLabel,
          params.activitiesJson,
          params.checksJson
        )
      : null;

  const progressCard =
    progressPayload != null
      ? progressDailyReportCardHtml({
          sectionEyebrow:
            params.kind === DailyEmailReportKind.ALL_REPORTS ? "Progress tracker (yesterday)" : undefined,
          dateLabel: progressPayload.dateLabel,
          overviewLine: progressPayload.overviewLine,
          items: progressPayload.items,
          footerLine: progressPayload.footerLine,
        })
      : emptyProgressCard("No progress tracker data synced yet.");

  const totalTasks = params.tasks.length;
  const groups = totalTasks === 0 ? [] : mapTasksToGroups(params.tasks, params.timeZone);
  const summaryLine =
    totalTasks === 0
      ? params.kind === DailyEmailReportKind.ALL_TASKS
        ? "No tasks in In progress or Today done."
        : "You have no tasks yet."
      : params.kind === DailyEmailReportKind.ALL_TASKS
        ? `${totalTasks} task${totalTasks === 1 ? "" : "s"} in In progress & Today done.`
        : `${totalTasks} task${totalTasks === 1 ? "" : "s"} across all projects.`;

  const tasksCard = allTasksReportCardHtml({
    sectionEyebrow: params.kind === DailyEmailReportKind.ALL_REPORTS ? "All tasks (current)" : undefined,
    asOfLabel: asOfLine,
    summaryLine,
    groups,
  });

  const todayShort = formatInTimeZone(new Date(), params.timeZone, "PPP");

  switch (params.kind) {
    case DailyEmailReportKind.PROGRESS_TRACKER:
      return {
        html: dailyEmailDocument(progressCard),
        subject: `Daily progress report — ${params.yesterdayLabel}`,
        reportDateStr: params.reportDateStr,
      };
    case DailyEmailReportKind.ALL_TASKS:
      return {
        html: dailyEmailDocument(tasksCard),
        subject: `All tasks — ${todayShort}`,
        reportDateStr: params.reportDateStr,
      };
    case DailyEmailReportKind.ALL_REPORTS:
      return {
        html: dailyEmailDocument(
          combinedDailyReportIntroRow({
            title: "Workspace",
            subtitle: `${asOfLine} Includes yesterday’s progress habits and your current task list.`,
          }) + progressCard + tasksCard
        ),
        subject: `Daily report — ${todayShort}`,
        reportDateStr: params.reportDateStr,
      };
  }
}
