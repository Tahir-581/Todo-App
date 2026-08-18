import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * JS `getTimezoneOffset()` minutes → fixed-offset IANA zone (no DST). Used only when `reportTimeZone` is unset.
 * Positive offset = local time behind UTC (Americas); negative = ahead (Asia).
 */
export function offsetMinutesToEtcGmtZone(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "Etc/UTC";
  const sign = offsetMinutes > 0 ? "+" : "-";
  const hours = Math.round(Math.abs(offsetMinutes) / 60);
  return `Etc/GMT${sign}${hours}`;
}

export function getEffectiveReportTimeZone(u: {
  reportTimeZone?: string | null;
  reportTzOffsetMinutes: number;
}): string {
  const t = u.reportTimeZone?.trim();
  if (t) return t;
  return offsetMinutesToEtcGmtZone(u.reportTzOffsetMinutes);
}

/** Calendar `yyyy-MM-dd` for "today" in the given IANA zone. */
export function calendarTodayYmd(timeZone: string): string {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
}

/** Previous calendar day as `yyyy-MM-dd` (naive date math on the string components). */
export function calendarYesterdayYmd(timeZone: string): string {
  const today = calendarTodayYmd(timeZone);
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Long date label for a calendar ymd interpreted in the zone (noon anchor avoids edge cases). */
export function formatYmdLongInZone(ymd: string, timeZone: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return formatInTimeZone(utcNoon, timeZone, "PPPP");
}

export function formatNowInZone(timeZone: string): string {
  return formatInTimeZone(new Date(), timeZone, "PPpp");
}

export function formatShortDateInZone(timeZone: string): string {
  return formatInTimeZone(new Date(), timeZone, "PPP");
}

/** Minutes since local midnight in the zone (for send-time gate). */
export function localMinutesSinceMidnight(timeZone: string): number {
  const now = new Date();
  const hh = formatInTimeZone(now, timeZone, "HH");
  const mm = formatInTimeZone(now, timeZone, "mm");
  return Number(hh) * 60 + Number(mm);
}

/** JavaScript weekday in the zone: 0 = Sunday … 6 = Saturday (matches `Date#getDay`). */
export function localJsWeekdaySun0To6(timeZone: string): number {
  return toZonedTime(new Date(), timeZone).getDay();
}
