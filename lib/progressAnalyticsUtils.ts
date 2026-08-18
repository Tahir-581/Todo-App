import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { PtActivity, PtChecks, DailyStats, InsightItem, WeeklyStats } from "./progressTrackerTypes";
import {
  getDaysInMonthGrid,
  globalStreakFromToday,
  isChecked,
  monthCompletionForActivity,
  safeRatio,
  toDateStr,
} from "./progressTrackerUtils";

export type SummaryStats = {
  overallRate: number;
  overallDone: number;
  overallPossible: number;
  topActivity: PtActivity | null;
  topActivityRate: number;
  bestWeekday: string | null;
  bestWeekdayAvg: number;
  bestStreak: number;
  bestStreakActivity: PtActivity | null;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function elapsedDaysInMonth(days: Date[], today: Date): Date[] {
  const t0 = startOfDay(today);
  return days.filter((d) => !isAfter(startOfDay(d), t0));
}

export function computeSummaryStats(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date
): SummaryStats {
  const days = getDaysInMonthGrid(year, monthIndex);
  const elapsed = elapsedDaysInMonth(days, today);
  const nAct = activities.length;
  const overallPossible = elapsed.length * nAct;
  let overallDone = 0;
  for (const d of elapsed) {
    const ds = toDateStr(d);
    for (const a of activities) {
      if (isChecked(checks, ds, a.id)) overallDone += 1;
    }
  }
  const overallRate = safeRatio(overallDone, overallPossible);

  let topActivity: PtActivity | null = null;
  let topActivityRate = 0;
  for (const a of activities) {
    const { checked, eligible } = monthCompletionForActivity(a.id, checks, days, today);
    const r = safeRatio(checked, eligible);
    if (eligible > 0 && r >= topActivityRate) {
      topActivityRate = r;
      topActivity = a;
    }
  }

  const weekdayTotals = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  for (const d of elapsed) {
    const wd = getDay(d);
    let c = 0;
    const ds = toDateStr(d);
    for (const a of activities) {
      if (isChecked(checks, ds, a.id)) c += 1;
    }
    weekdayTotals[wd] += c;
    weekdayCounts[wd] += 1;
  }
  let bestW = -1;
  let bestAvg = -1;
  for (let w = 0; w < 7; w++) {
    if (weekdayCounts[w] === 0) continue;
    const avg = weekdayTotals[w] / weekdayCounts[w];
    if (avg > bestAvg) {
      bestAvg = avg;
      bestW = w;
    }
  }
  const bestWeekday = bestW >= 0 ? WEEKDAY_LABELS[bestW] : null;
  const bestWeekdayAvg = bestAvg >= 0 ? bestAvg : 0;

  let bestStreak = 0;
  let bestStreakActivity: PtActivity | null = null;
  for (const a of activities) {
    const s = globalStreakFromToday(a.id, checks, today);
    if (s > bestStreak) {
      bestStreak = s;
      bestStreakActivity = a;
    }
  }

  return {
    overallRate,
    overallDone,
    overallPossible,
    topActivity,
    topActivityRate,
    bestWeekday,
    bestWeekdayAvg,
    bestStreak,
    bestStreakActivity,
  };
}

export function buildDailyBarData(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date
): DailyStats[] {
  const days = getDaysInMonthGrid(year, monthIndex);
  const t0 = startOfDay(today);
  const n = activities.length;
  return days.map((d) => {
    const ds = toDateStr(d);
    let completed = 0;
    for (const a of activities) {
      if (isChecked(checks, ds, a.id)) completed += 1;
    }
    const dayStart = startOfDay(d);
    const isFuture = isAfter(dayStart, t0);
    const isToday = isSameDay(dayStart, t0);
    const total = n;
    const ratio = n > 0 ? completed / n : 0;
    return {
      day: d.getDate(),
      dateStr: ds,
      label: format(d, "MMM d"),
      completed,
      total,
      ratio,
      isFuture,
      isToday,
    };
  });
}

export function barColorForDay(d: DailyStats): string {
  if (d.total === 0) return "rgba(255,255,255,0.06)";
  if (d.isFuture) return "rgba(255,255,255,0.06)";
  if (d.ratio >= 1) return "#22c55e";
  if (d.ratio >= 0.7) return "#14b8a6";
  if (d.ratio >= 0.4) return "#f59e0b";
  if (d.ratio > 0) return "#f97316";
  return "rgba(255,255,255,0.06)";
}

export type CumulativePoint = {
  day: number;
  dateStr: string;
  label: string;
  isFuture: boolean;
} & Record<string, number | string | boolean | null | undefined>;

export function buildCumulativeLineData(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date
): CumulativePoint[] {
  const days = getDaysInMonthGrid(year, monthIndex);
  const t0 = startOfDay(today);
  const result: CumulativePoint[] = [];
  const running: Record<string, number> = {};
  for (const a of activities) running[a.id] = 0;

  for (const d of days) {
    const ds = toDateStr(d);
    const dayStart = startOfDay(d);
    const isFuture = isAfter(dayStart, t0);
    const row: CumulativePoint = {
      day: d.getDate(),
      dateStr: ds,
      label: format(d, "MMM d"),
      isFuture,
    };
    for (const a of activities) {
      if (!isFuture && isChecked(checks, ds, a.id)) {
        running[a.id] += 1;
      }
      row[a.id] = running[a.id];
    }
    result.push(row);
  }
  return result;
}

export type HeatmapCell = {
  key: string;
  day: number | null;
  dateStr: string | null;
  ratio: number;
  completed: number;
  total: number;
  isToday: boolean;
  isFuture: boolean;
};

export function buildHeatmapCells(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date
): { cells: HeatmapCell[]; weekRowCount: number } {
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthEnd = endOfMonth(monthStart);
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const t0 = startOfDay(today);
  const n = activities.length;

  const cells: HeatmapCell[] = gridDays.map((d, i) => {
    const inMonth = isSameMonth(d, monthStart);
    const ds = toDateStr(d);
    let completed = 0;
    if (inMonth && n > 0) {
      for (const a of activities) {
        if (isChecked(checks, ds, a.id)) completed += 1;
      }
    }
    const dayStart = startOfDay(d);
    const isFuture = isAfter(dayStart, t0);
    const isToday = isSameDay(dayStart, t0);
    const ratio = n > 0 && inMonth ? completed / n : 0;
    return {
      key: `h-${i}-${ds}`,
      day: inMonth ? d.getDate() : null,
      dateStr: inMonth ? ds : null,
      ratio,
      completed,
      total: n,
      isToday: inMonth && isToday,
      isFuture: inMonth && isFuture,
    };
  });

  const weekRowCount = Math.ceil(cells.length / 7);
  return { cells, weekRowCount };
}

export function heatmapCellBg(c: HeatmapCell, n: number): string {
  if (c.day == null) return "transparent";
  if (n === 0) return "rgba(255,255,255,0.04)";
  if (c.isFuture) return "rgba(255,255,255,0.04)";
  if (c.ratio <= 0) return "rgba(255,255,255,0.04)";
  if (c.ratio <= 0.25) return "rgba(20,184,166,0.15)";
  if (c.ratio <= 0.5) return "rgba(20,184,166,0.35)";
  if (c.ratio <= 0.75) return "rgba(20,184,166,0.60)";
  if (c.ratio < 1) return "rgba(20,184,166,0.80)";
  return "#14b8a6";
}

export function buildWeeklyStats(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date
): WeeklyStats[] {
  const days = getDaysInMonthGrid(year, monthIndex);
  if (days.length === 0) return [];
  const t0 = startOfDay(today);
  const nAct = activities.length;

  const chunks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    chunks.push(days.slice(i, i + 7));
  }

  return chunks.map((w, idx) => {
    const start = w[0];
    const end = w[w.length - 1];
    let totalCompletions = 0;
    let elapsedInChunk = 0;
    for (const d of w) {
      if (isAfter(startOfDay(d), t0)) continue;
      elapsedInChunk += 1;
      const ds = toDateStr(d);
      for (const a of activities) {
        if (isChecked(checks, ds, a.id)) totalCompletions += 1;
      }
    }
    const denom = elapsedInChunk > 0 ? elapsedInChunk : 1;
    const avgPerDay = totalCompletions / denom;
    const startStr = format(start, "MMM d");
    const endStr = format(end, "MMM d");
    return {
      weekIndex: idx + 1,
      label: `Week ${idx + 1} (${startStr}–${endStr})`,
      startStr,
      endStr,
      totalCompletions,
      activityCount: nAct,
      daysInWeek: w.length,
      avgPerDay,
    };
  });
}

export type DonutSlice = {
  id: string;
  name: string;
  color: string;
  value: number;
  pctOfTotal: number;
  monthRate: number;
};

export function buildDonutAndBars(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date
): { slices: DonutSlice[]; totalCheckIns: number; bars: DonutSlice[] } {
  const days = getDaysInMonthGrid(year, monthIndex);
  const slices: DonutSlice[] = [];
  let totalCheckIns = 0;
  for (const a of activities) {
    const { checked } = monthCompletionForActivity(a.id, checks, days, today);
    totalCheckIns += checked;
    slices.push({
      id: a.id,
      name: a.name,
      color: a.color,
      value: checked,
      pctOfTotal: 0,
      monthRate: 0,
    });
  }
  for (const s of slices) {
    s.pctOfTotal = safeRatio(s.value, totalCheckIns) * 100;
    const { checked, eligible } = monthCompletionForActivity(s.id, checks, days, today);
    s.monthRate = safeRatio(checked, eligible) * 100;
  }
  const bars = [...slices].sort((a, b) => b.monthRate - a.monthRate);
  return { slices, totalCheckIns, bars };
}

export function generateInsights(
  activities: PtActivity[],
  checks: PtChecks,
  year: number,
  monthIndex: number,
  today: Date,
  summary: SummaryStats
): InsightItem[] {
  const days = getDaysInMonthGrid(year, monthIndex);
  const elapsed = elapsedDaysInMonth(days, today);
  const insights: InsightItem[] = [];

  if (activities.length === 0) {
    return [
      {
        id: "no-activities",
        text: "Add activities to see personalized insights.",
        sentiment: "positive",
      },
    ];
  }

  if (elapsed.length < 3) {
    return [
      {
        id: "placeholder",
        text: "Not enough data yet — check back after a few days of tracking.",
        sentiment: "positive",
      },
    ];
  }

  for (const a of activities) {
    const s = globalStreakFromToday(a.id, checks, today);
    if (s >= 3) {
      insights.push({
        id: `streak-${a.id}`,
        text: `🔥 You're on a ${s}-day streak with ${a.name}! Keep it going.`,
        sentiment: "positive",
      });
      break;
    }
  }

  let bestCons: PtActivity | null = null;
  let bestConsRate = 0;
  for (const a of activities) {
    const { checked, eligible } = monthCompletionForActivity(a.id, checks, days, today);
    const r = safeRatio(checked, eligible);
    if (eligible > 0 && r >= 0.8 && r >= bestConsRate) {
      bestConsRate = r;
      bestCons = a;
    }
  }
  if (bestCons) {
    insights.push({
      id: "consistent",
      text: `⭐ ${bestCons.name} is your most consistent habit at ${Math.round(bestConsRate * 100)}% this month.`,
      sentiment: "positive",
    });
  }

  for (const a of activities) {
    const { checked, eligible } = monthCompletionForActivity(a.id, checks, days, today);
    const r = safeRatio(checked, eligible);
    if (eligible > 0 && r <= 0.3) {
      insights.push({
        id: `attention-${a.id}`,
        text: `⚠️ ${a.name} needs attention — only completed ${Math.round(r * 100)}% of days so far.`,
        sentiment: "critical",
      });
    }
  }

  if (summary.bestWeekday) {
    insights.push({
      id: "bestday",
      text: `📅 You're most productive on ${summary.bestWeekday}s — your highest average completion day.`,
      sentiment: "positive",
    });
  }

  let perfectDays = 0;
  const nAct = activities.length;
  if (nAct > 0) {
    for (const d of elapsed) {
      const ds = toDateStr(d);
      let c = 0;
      for (const a of activities) {
        if (isChecked(checks, ds, a.id)) c += 1;
      }
      if (c === nAct) perfectDays += 1;
    }
  }
  if (perfectDays > 0) {
    insights.push({
      id: "perfect",
      text: `✨ You had ${perfectDays} perfect day(s) this month where you completed every activity.`,
      sentiment: "positive",
    });
  }

  const first7 = elapsed.slice(0, 7);
  const last7 = elapsed.slice(-7);
  const rateSlice = (slice: Date[]) => {
    if (slice.length === 0 || nAct === 0) return 0;
    let done = 0;
    let poss = 0;
    for (const d of slice) {
      const ds = toDateStr(d);
      poss += nAct;
      for (const a of activities) {
        if (isChecked(checks, ds, a.id)) done += 1;
      }
    }
    return safeRatio(done, poss);
  };
  const rFirst = rateSlice(first7);
  const rLast = rateSlice(last7);
  if (last7.length >= 3 && first7.length >= 3 && rLast > rFirst) {
    insights.push({
      id: "momentum",
      text: "📈 Great momentum! Your completion rate this week is higher than your month average.",
      sentiment: "positive",
    });
  } else if (last7.length >= 3 && first7.length >= 3 && rLast < rFirst) {
    insights.push({
      id: "slow",
      text: "📉 Your pace has slowed down compared to your month start. Time to re-engage!",
      sentiment: "warning",
    });
  }

  const t0 = startOfDay(today);
  if (isSameMonth(new Date(year, monthIndex, 1), t0) && nAct > 0) {
    const ds = toDateStr(t0);
    let allToday = true;
    for (const a of activities) {
      if (!isChecked(checks, ds, a.id)) allToday = false;
    }
    if (allToday) {
      insights.push({
        id: "caughtup",
        text: "🎯 All activities completed for today. Excellent work!",
        sentiment: "positive",
      });
    }
  }

  const seen = new Set<string>();
  const unique = insights.filter((x) => {
    if (seen.has(x.text)) return false;
    seen.add(x.text);
    return true;
  });

  return unique.slice(0, 5);
}
