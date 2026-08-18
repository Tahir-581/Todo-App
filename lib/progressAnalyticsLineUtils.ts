import { isAfter, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import type { PtActivity } from "./progressTrackerTypes";
import type { CumulativePoint } from "./progressAnalyticsUtils";

/** Splits each activity into solid (past+today) and dashed (today+future) line keys for Recharts. */
export function withDualLineKeys(
  data: CumulativePoint[],
  activities: PtActivity[],
  today: Date
): CumulativePoint[] {
  const t0 = startOfDay(today);
  return data.map((row) => {
    const d = startOfDay(parseISO(row.dateStr));
    const isFut = isAfter(d, t0);
    const isTo = isSameDay(d, t0);
    const isPast = isBefore(d, t0);
    const next: CumulativePoint = { ...row };
    for (const a of activities) {
      const v = (row[a.id] as number) ?? 0;
      next[`${a.id}__s`] = isPast || isTo ? v : null;
      next[`${a.id}__d`] = isTo || isFut ? v : null;
    }
    return next;
  });
}
