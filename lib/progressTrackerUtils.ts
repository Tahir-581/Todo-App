import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import type { PtChecks } from "./progressTrackerTypes";

export function makeCheckKey(dateStr: string, activityId: string): string {
  return `${dateStr}_${activityId}`;
}

export function parseCheckKey(key: string): { dateStr: string; activityId: string } | null {
  const m = key.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!m) return null;
  return { dateStr: m[1], activityId: m[2] };
}

export function isChecked(checks: PtChecks, dateStr: string, activityId: string): boolean {
  return checks[makeCheckKey(dateStr, activityId)] === true;
}

export function getDaysInMonthGrid(year: number, monthIndex: number): Date[] {
  const start = startOfMonth(new Date(year, monthIndex, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export function formatDateCell(d: Date): string {
  return format(d, "EEE, MMM d");
}

export function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Streak within viewed month, counting backward from anchor day */
export function streakInMonthView(
  activityId: string,
  checks: PtChecks,
  viewYear: number,
  viewMonthIndex: number,
  today: Date
): number {
  const monthStart = startOfMonth(new Date(viewYear, viewMonthIndex, 1));
  const monthEnd = endOfMonth(monthStart);
  const todayStart = startOfDay(today);

  let anchor: Date;
  if (isSameMonth(monthStart, todayStart)) {
    anchor = todayStart > monthEnd ? monthEnd : todayStart;
    if (isBefore(anchor, monthStart)) anchor = monthStart;
  } else if (isBefore(monthEnd, todayStart)) {
    anchor = monthEnd;
  } else {
    return 0;
  }

  let streak = 0;
  let d = anchor;
  while (!isBefore(d, monthStart)) {
    const ds = toDateStr(d);
    if (isChecked(checks, ds, activityId)) {
      streak += 1;
      d = new Date(d);
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Consecutive checked days backward from real today (any month) */
export function globalStreakFromToday(activityId: string, checks: PtChecks, today: Date): number {
  let streak = 0;
  let d = startOfDay(today);
  for (let i = 0; i < 365 * 5; i++) {
    const ds = toDateStr(d);
    if (isChecked(checks, ds, activityId)) {
      streak += 1;
      d = new Date(d);
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Previous calendar day as `yyyy-MM-dd` (UTC date arithmetic on components). */
export function prevCalendarYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Streak ending on `endDateStr` using tracker keys `yyyy-MM-dd` (server-timezone-safe). */
export function globalStreakAsOfDateStr(activityId: string, checks: PtChecks, endDateStr: string): number {
  let streak = 0;
  let ds = endDateStr;
  for (let i = 0; i < 365 * 5; i++) {
    if (isChecked(checks, ds, activityId)) {
      streak += 1;
      ds = prevCalendarYmd(ds);
    } else {
      break;
    }
  }
  return streak;
}

export function removeChecksForActivity(checks: PtChecks, activityId: string): PtChecks {
  const next: PtChecks = {};
  for (const key of Object.keys(checks)) {
    if (checks[key] !== true) continue;
    const parsed = parseCheckKey(key);
    if (parsed && parsed.activityId !== activityId) {
      next[key] = true;
    }
  }
  return next;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function monthCompletionForActivity(
  activityId: string,
  checks: PtChecks,
  days: Date[],
  today: Date
): { checked: number; eligible: number } {
  let checked = 0;
  let eligible = 0;
  for (const d of days) {
    const ds = toDateStr(d);
    const dayStart = startOfDay(d);
    if (isAfter(dayStart, today)) continue;
    eligible += 1;
    if (isChecked(checks, ds, activityId)) checked += 1;
  }
  return { checked, eligible };
}

export function safeRatio(num: number, den: number): number {
  if (den <= 0) return 0;
  return num / den;
}

export function countCheckedDaysInMonth(
  activityId: string,
  checks: PtChecks,
  days: Date[]
): number {
  let c = 0;
  for (const d of days) {
    if (isChecked(checks, toDateStr(d), activityId)) c += 1;
  }
  return c;
}

export function completionRateColor(rate: number): "green" | "amber" | "red" {
  if (rate >= 0.7) return "green";
  if (rate >= 0.4) return "amber";
  return "red";
}
