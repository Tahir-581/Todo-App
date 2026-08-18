import { DailyEmailReportKind, TaskStatus } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { getProgressTrackerReportPayload } from "@/lib/progressDailyReport";
import type { TaskForDailyEmail } from "@/lib/dailyEmailComposer";

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

const WA_MAX = 4000;

/** Strip HTML from task description for plain-text WhatsApp. */
function stripHtmlToPlain(html: string): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** WhatsApp bold: *text* — avoid raw * inside titles breaking formatting. */
function waBoldLine(title: string): string {
  const safe = title.replace(/\*/g, "×");
  return `*${safe}*`;
}

function truncate(s: string): string {
  if (s.length <= WA_MAX) return s;
  return `${s.slice(0, WA_MAX - 3)}...`;
}

function progressSectionPlain(params: {
  kind: DailyEmailReportKind;
  reportDateStr: string;
  yesterdayLabel: string;
  activitiesJson: string | null;
  checksJson: string | null;
}): string {
  const header =
    params.kind === DailyEmailReportKind.ALL_REPORTS
      ? "Progress tracker (yesterday)"
      : "Daily progress";
  if (params.activitiesJson == null || params.checksJson == null) {
    return `${header}\nNo progress tracker data synced yet. Open the Progress page while signed in to sync.`;
  }
  const payload = getProgressTrackerReportPayload(
    params.reportDateStr,
    params.yesterdayLabel,
    params.activitiesJson,
    params.checksJson
  );
  const lines = [
    header,
    payload.dateLabel,
    payload.overviewLine,
    "",
    ...payload.items.map((it) =>
      `${it.checked ? "✓" : "○"} ${it.name}${it.streak ? ` (${it.streak})` : ""}`
    ),
    "",
    payload.footerLine,
  ];
  return lines.join("\n");
}

function tasksSectionPlain(
  tasks: TaskForDailyEmail[],
  asOfLine: string,
  emptyDetail = "You have no tasks yet."
): string {
  const header = "All tasks (current)";
  if (tasks.length === 0) {
    return `${header}\n${asOfLine}\n${emptyDetail}`;
  }
  const byStatus = new Map<TaskStatus, TaskForDailyEmail[]>();
  for (const s of STATUS_ORDER) byStatus.set(s, []);
  for (const t of tasks) {
    const list = byStatus.get(t.status);
    if (list) list.push(t);
    else byStatus.set(t.status, [t]);
  }

  const nInProgress = (byStatus.get(TaskStatus.IN_PROGRESS) ?? []).length;
  const nTodayDone = (byStatus.get(TaskStatus.TODAY_DONE) ?? []).length;

  const lines = [
    header,
    asOfLine,
    `In progress: ${nInProgress}`,
    `Today done: ${nTodayDone}`,
    "",
  ];

  const subIndent = "   ";

  for (const st of STATUS_ORDER) {
    const group = byStatus.get(st) ?? [];
    if (group.length === 0) continue;
    lines.push(`— ${statusLabel(st)} —`);
    let i = 1;
    for (const t of group) {
      lines.push(`${i}. ${waBoldLine(t.title)}`);
      i += 1;
      const desc = stripHtmlToPlain(t.description ?? "");
      if (desc) {
        for (const para of desc.split("\n")) {
          const line = para.trim();
          if (line) lines.push(`${subIndent}${line}`);
        }
      }
      for (const c of t.comments ?? []) {
        const text = stripHtmlToPlain(c.content ?? "");
        if (text) {
          for (const para of text.split("\n")) {
            const line = para.trim();
            if (line) lines.push(`${subIndent}${line}`);
          }
        }
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/**
 * Plain-text body for WhatsApp daily report (mirrors {@link composeDailyEmail} structure).
 */
export function composeDailyWhatsAppText(params: {
  kind: DailyEmailReportKind;
  timeZone: string;
  reportDateStr: string;
  yesterdayLabel: string;
  asOfFormatted: string;
  activitiesJson: string | null;
  checksJson: string | null;
  tasks: TaskForDailyEmail[];
}): { text: string; subjectLine: string; reportDateStr: string } {
  const asOfLine = `As of ${params.asOfFormatted}.`;
  const todayShort = formatInTimeZone(new Date(), params.timeZone, "PPP");

  switch (params.kind) {
    case DailyEmailReportKind.PROGRESS_TRACKER: {
      const body = progressSectionPlain({
        kind: params.kind,
        reportDateStr: params.reportDateStr,
        yesterdayLabel: params.yesterdayLabel,
        activitiesJson: params.activitiesJson,
        checksJson: params.checksJson,
      });
      const title = `Daily progress — ${params.yesterdayLabel}`;
      return {
        text: truncate(`${title}\n\n${body}`),
        subjectLine: title,
        reportDateStr: params.reportDateStr,
      };
    }
    case DailyEmailReportKind.ALL_TASKS: {
      const title = `All tasks — ${todayShort}`;
      const body = tasksSectionPlain(params.tasks, asOfLine, "No tasks in In progress or Today done.");
      return {
        text: truncate(`${title}\n\n${body}`),
        subjectLine: title,
        reportDateStr: params.reportDateStr,
      };
    }
    case DailyEmailReportKind.ALL_REPORTS: {
      const title = `Daily report — ${todayShort}`;
      const prog = progressSectionPlain({
        kind: params.kind,
        reportDateStr: params.reportDateStr,
        yesterdayLabel: params.yesterdayLabel,
        activitiesJson: params.activitiesJson,
        checksJson: params.checksJson,
      });
      const tasks = tasksSectionPlain(params.tasks, asOfLine);
      const body = `${prog}\n\n${"—".repeat(12)}\n\n${tasks}`;
      return {
        text: truncate(`${title}\n\n${body}`),
        subjectLine: title,
        reportDateStr: params.reportDateStr,
      };
    }
  }
}
