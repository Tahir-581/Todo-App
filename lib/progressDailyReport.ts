import { dailyEmailDocument, progressDailyReportCardHtml } from "@/lib/email";
import type { PtActivity, PtChecks } from "@/lib/progressTrackerTypes";
import { globalStreakAsOfDateStr, isChecked } from "@/lib/progressTrackerUtils";

export function parseProgressTrackerStateJson(activitiesJson: string, checksJson: string) {
  let activities: PtActivity[] = [];
  let checks: PtChecks = {};
  try {
    const a = JSON.parse(activitiesJson) as unknown;
    if (Array.isArray(a)) activities = a as PtActivity[];
  } catch {
    /* ignore */
  }
  try {
    const c = JSON.parse(checksJson) as unknown;
    if (c && typeof c === "object") checks = c as PtChecks;
  } catch {
    /* ignore */
  }
  return { activities, checks };
}

export function getProgressTrackerReportPayload(
  reportDateStr: string,
  dateLabel: string,
  activitiesJson: string,
  checksJson: string
) {
  const { activities, checks } = parseProgressTrackerStateJson(activitiesJson, checksJson);
  const doneCount = activities.filter((a) => isChecked(checks, reportDateStr, a.id)).length;
  const totalCount = activities.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const items = activities.map((a) => ({
    name: a.name,
    checked: isChecked(checks, reportDateStr, a.id),
    color: a.color,
    streak: globalStreakAsOfDateStr(a.id, checks, reportDateStr),
  }));

  const overviewLine =
    totalCount === 0
      ? "No activities are being tracked yet."
      : `${doneCount} of ${totalCount} activities completed (${pct}%).`;

  const footerLine =
    "Synced from your Progress Tracker. Update it in the app to keep reports accurate.";

  return {
    reportDateStr,
    dateLabel,
    overviewLine,
    items,
    footerLine,
  };
}

export function buildProgressDailyReportForDate(
  reportDateStr: string,
  dateLabel: string,
  activitiesJson: string,
  checksJson: string
) {
  const payload = getProgressTrackerReportPayload(reportDateStr, dateLabel, activitiesJson, checksJson);
  const card = progressDailyReportCardHtml({
    dateLabel: payload.dateLabel,
    overviewLine: payload.overviewLine,
    items: payload.items,
    footerLine: payload.footerLine,
  });
  return {
    html: dailyEmailDocument(card),
    subject: `Daily progress report — ${payload.dateLabel}`,
    reportDateStr: payload.reportDateStr,
    dateLabel: payload.dateLabel,
    cardHtml: card,
  };
}
