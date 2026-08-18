/** Default 09:00 local (minutes since midnight). */
export const DEFAULT_DAILY_REPORT_SEND_MINUTES = 540;

/** Email "send now" uses this slot in `ProgressDailyReportLog` so it does not collide with clock slots 0–1439. */
export const DAILY_REPORT_SEND_NOW_SLOT_MINUTES = -1;

const MAX_SLOTS = 48;

/**
 * Deduplicate, sort, clamp to 0–1439; fall back to default if empty or invalid input.
 */
export function normalizeDailyReportSendMinutes(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [DEFAULT_DAILY_REPORT_SEND_MINUTES];
  }
  const nums = raw
    .map((x) => (typeof x === "number" && Number.isFinite(x) ? Math.floor(x) : NaN))
    .filter((n) => n >= 0 && n <= 1439);
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  if (unique.length === 0) {
    return [DEFAULT_DAILY_REPORT_SEND_MINUTES];
  }
  return unique.slice(0, MAX_SLOTS);
}

/** Smallest scheduled minute — used as fallback for per-activity WhatsApp reminder default time. */
export function earliestDailyReportSendMinute(slots: number[]): number {
  const s = normalizeDailyReportSendMinutes(slots);
  return s[0] ?? DEFAULT_DAILY_REPORT_SEND_MINUTES;
}
