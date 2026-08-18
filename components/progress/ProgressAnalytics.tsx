"use client";

import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { PtActivity, PtChecks, InsightItem } from "@/lib/progressTrackerTypes";
import {
  barColorForDay,
  buildCumulativeLineData,
  buildDailyBarData,
  buildDonutAndBars,
  buildHeatmapCells,
  buildWeeklyStats,
  computeSummaryStats,
  generateInsights,
  heatmapCellBg,
} from "@/lib/progressAnalyticsUtils";
import { withDualLineKeys } from "@/lib/progressAnalyticsLineUtils";
import {
  completionRateColor,
  safeRatio,
} from "@/lib/progressTrackerUtils";

type Props = {
  activities: PtActivity[];
  checks: PtChecks;
  viewYear: number;
  viewMonthIndex: number;
  today: Date;
};

function rateTextClass(rate: number): string {
  const c = completionRateColor(rate);
  if (c === "green") return "text-emerald-400";
  if (c === "amber") return "text-amber-400";
  return "text-red-400";
}

function insightBorderClass(s: InsightItem["sentiment"]): string {
  if (s === "positive") return "border-l-emerald-500";
  if (s === "warning") return "border-l-amber-500";
  return "border-l-red-500";
}

function DailyBarShape(props: {
  payload?: { isToday?: boolean; barFill?: string };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
  const rectFill = fill ?? payload?.barFill ?? "rgba(255,255,255,0.06)";
  return (
    <g>
      {payload?.isToday ? (
        <text
          x={x + width / 2}
          y={y - 6}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize={9}
          className="light:fill-zinc-600"
        >
          TODAY
        </text>
      ) : null}
      <rect x={x} y={y} width={width} height={height} fill={rectFill} rx={4} ry={0} />
    </g>
  );
}

export function ProgressAnalytics({ activities, checks, viewYear, viewMonthIndex, today }: Props) {
  const summary = useMemo(
    () => computeSummaryStats(activities, checks, viewYear, viewMonthIndex, today),
    [activities, checks, viewYear, viewMonthIndex, today]
  );
  const dailyData = useMemo(
    () => buildDailyBarData(activities, checks, viewYear, viewMonthIndex, today),
    [activities, checks, viewYear, viewMonthIndex, today]
  );
  const dailyWithFill = useMemo(
    () => dailyData.map((d) => ({ ...d, barFill: barColorForDay(d) })),
    [dailyData]
  );
  const cumulativeRaw = useMemo(
    () => buildCumulativeLineData(activities, checks, viewYear, viewMonthIndex, today),
    [activities, checks, viewYear, viewMonthIndex, today]
  );
  const cumulativeData = useMemo(
    () => withDualLineKeys(cumulativeRaw, activities, today),
    [cumulativeRaw, activities, today]
  );
  const { cells: heatmapCells } = useMemo(
    () => buildHeatmapCells(activities, checks, viewYear, viewMonthIndex, today),
    [activities, checks, viewYear, viewMonthIndex, today]
  );
  const weeklyData = useMemo(
    () => buildWeeklyStats(activities, checks, viewYear, viewMonthIndex, today),
    [activities, checks, viewYear, viewMonthIndex, today]
  );
  const { slices: donutSlices, totalCheckIns, bars: barRows } = useMemo(
    () => buildDonutAndBars(activities, checks, viewYear, viewMonthIndex, today),
    [activities, checks, viewYear, viewMonthIndex, today]
  );
  const insights = useMemo(
    () => generateInsights(activities, checks, viewYear, viewMonthIndex, today, summary),
    [activities, checks, viewYear, viewMonthIndex, today, summary]
  );

  const yMax = Math.max(1, activities.length);
  const pieData =
    totalCheckIns > 0
      ? donutSlices.filter((s) => s.value > 0)
      : [{ id: "empty", name: "—", color: "rgba(255,255,255,0.08)", value: 1, pctOfTotal: 100, monthRate: 0 }];

  const lineTooltip = ({
    active,
    label,
    payload,
  }: {
    active?: boolean;
    label?: string;
    payload?: { payload?: Record<string, unknown> }[];
  }) => {
    if (!active || !payload?.[0]?.payload) return null;
    const row = payload[0].payload;
    const dayLabel = String(row.label ?? label ?? "");
    return (
      <div className="rounded-lg border border-zinc-800 bg-[#161618] px-3 py-2 text-xs shadow-xl light:border-zinc-200 light:bg-white">
        <p className="font-medium text-zinc-200 light:text-zinc-900">{dayLabel}</p>
        {activities.map((a) => {
          const v = Number(row[a.id] ?? 0);
          return (
            <p key={a.id} className="text-zinc-400 light:text-zinc-600">
              {a.name}: {v}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <section className="mt-12 border-t border-zinc-800/80 pt-12 light:border-zinc-200">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-zinc-100 light:text-zinc-900">
        <BarChart3 className="h-5 w-5 text-teal-500" aria-hidden />
        Analytics &amp; Insights
      </h2>

      <div className="mt-5 flex flex-col gap-5">
        {/* Block 1 */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Overall Completion</p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${rateTextClass(summary.overallRate)}`}>
              {summary.overallPossible > 0 ? `${Math.round(summary.overallRate * 100)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.overallDone} of {summary.overallPossible} possible check-ins done
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Top Activity</p>
            <p
              className="mt-2 truncate text-lg font-semibold text-zinc-100 light:text-zinc-900"
              style={{ color: summary.topActivity?.color ?? undefined }}
            >
              {summary.topActivity?.name ?? "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.topActivity && summary.topActivityRate > 0
                ? `${Math.round(summary.topActivityRate * 100)}% completion rate`
                : "No data"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Best Day</p>
            <p className="mt-2 text-2xl font-semibold text-teal-400">{summary.bestWeekday ?? "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">Highest average completions</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Best Streak</p>
            <p className="mt-2 text-2xl font-semibold text-amber-400">
              🔥 {summary.bestStreak > 0 ? summary.bestStreak : "—"}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {summary.bestStreakActivity
                ? `${summary.bestStreakActivity.name} — ${summary.bestStreak} days`
                : "No active streak"}
            </p>
          </div>
        </div>

        {/* Block 2 */}
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h3 className="font-medium text-zinc-200 light:text-zinc-900">Daily Completion Overview</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Total activities completed per day this month</p>
          <div className="mt-4 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyWithFill} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis
                  allowDecimals={false}
                  domain={[0, yMax]}
                  stroke="#71717a"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload as (typeof dailyWithFill)[0];
                    return (
                      <div className="rounded-lg border border-zinc-800 bg-[#161618] px-3 py-2 text-xs light:border-zinc-200 light:bg-white">
                        {p.label} — {p.completed} / {p.total} activities completed
                      </div>
                    );
                  }}
                />
                <Bar dataKey="completed" shape={DailyBarShape}>
                  {dailyWithFill.map((e, i) => (
                    <Cell key={`c-${i}`} fill={e.barFill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Block 3 */}
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h3 className="font-medium text-zinc-200 light:text-zinc-900">Activity Trends</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Cumulative completions over the month per activity</p>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <XAxis dataKey="day" stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={lineTooltip} />
                {activities.map((a) => (
                  <Line
                    key={a.id}
                    type="monotone"
                    dataKey={`${a.id}__s`}
                    stroke={a.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: a.color }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
                {activities.map((a) => (
                  <Line
                    key={`${a.id}-d`}
                    type="monotone"
                    dataKey={`${a.id}__d`}
                    stroke={a.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 border-t border-zinc-800/60 pt-4 light:border-zinc-200">
            {activities.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}
              </span>
            ))}
          </div>
        </div>

        {/* Block 4 */}
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h3 className="font-medium text-zinc-200 light:text-zinc-900">Completion Heatmap</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Check-in intensity across the month — darker = more done</p>
          <div className="mt-4">
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-zinc-500">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div
              className="grid w-max max-w-full gap-1"
              style={{ gridTemplateColumns: "repeat(7, 36px)" }}
            >
              {heatmapCells.map((c) => {
                const bg = heatmapCellBg(c, activities.length);
                const showNum = c.day != null;
                const textMuted = c.ratio < 0.51 && c.day != null && !c.isFuture;
                return (
                  <div
                    key={c.key}
                    title={
                      c.dateStr
                        ? `${format(parseISO(c.dateStr), "MMM d")} — ${c.completed} / ${c.total} activities`
                        : ""
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-[10px] font-medium ${
                      c.isToday ? "ring-2 ring-white ring-offset-0" : ""
                    } ${c.isFuture && c.day != null ? "border border-dashed border-zinc-600" : ""}`}
                    style={{
                      backgroundColor: c.day == null ? "transparent" : bg,
                      color: textMuted ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)",
                    }}
                  >
                    {showNum ? c.day : ""}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10px] text-zinc-500">Less</span>
              <div
                className="h-2 flex-1 max-w-xs rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(20,184,166,0.25), #14b8a6)",
                }}
              />
              <span className="text-[10px] text-zinc-500">More</span>
            </div>
          </div>
        </div>

        {/* Block 5 */}
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h3 className="font-medium text-zinc-200 light:text-zinc-900">Weekly Breakdown</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Average daily completions grouped by week</p>
          <div
            className="mt-4 w-full"
            style={{ height: Math.max(120, weeklyData.length * 40 + 40) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={weeklyData.length ? weeklyData : [{ label: "—", avgPerDay: 0, totalCompletions: 0, activityCount: 0, daysInWeek: 1 }]}
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={168}
                  stroke="#71717a"
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const w = payload[0].payload as (typeof weeklyData)[0];
                    return (
                      <div className="rounded-lg border border-zinc-800 bg-[#161618] px-3 py-2 text-xs light:border-zinc-200 light:bg-white">
                        Week {w.weekIndex}: {w.totalCompletions} total completions across {w.activityCount}{" "}
                        activities over {w.daysInWeek} days
                      </div>
                    );
                  }}
                />
                <Bar dataKey="avgPerDay" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={28}>
                  {weeklyData.map((_, i) => (
                    <Cell key={i} fill="#14b8a6" />
                  ))}
                  <LabelList
                    dataKey="avgPerDay"
                    position="right"
                    className="fill-zinc-400 text-[10px]"
                    formatter={(v: number) => `${v.toFixed(1)} / day`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Block 6 */}
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h3 className="font-medium text-zinc-200 light:text-zinc-900">Activity Balance</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Completion rate per activity as a share of the whole</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col items-center">
              <div className="h-[220px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {pieData.map((e) => (
                        <Cell key={e.id} fill={e.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="48%"
                      textAnchor="middle"
                      fill="#fafafa"
                      className="text-2xl font-semibold"
                      dominantBaseline="middle"
                    >
                      {totalCheckIns}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      fill="#71717a"
                      fontSize={11}
                      dominantBaseline="middle"
                    >
                      total check-ins
                    </text>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const s = payload[0].payload as (typeof donutSlices)[0];
                        const pct =
                          totalCheckIns > 0 ? Math.round(safeRatio(s.value, totalCheckIns) * 100) : 0;
                        return (
                          <div className="rounded-lg border border-zinc-800 bg-[#161618] px-3 py-2 text-xs light:border-zinc-200 light:bg-white">
                            {s.name} — {s.value} days ({pct}%)
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {donutSlices.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs text-zinc-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}{" "}
                    {totalCheckIns > 0 ? `(${Math.round(s.pctOfTotal)}%)` : ""}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {barRows.length === 0 ? (
                <p className="text-sm text-zinc-500">Add activities to see progress bars.</p>
              ) : (
                barRows.map((s) => (
                  <div key={s.id} className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span className="truncate pr-2">{s.name}</span>
                      <span className="shrink-0 font-mono text-zinc-300">{Math.round(s.monthRate)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800 light:bg-zinc-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, s.monthRate)}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Block 7 */}
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h3 className="font-medium text-zinc-200 light:text-zinc-900">Smart Insights</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Observations based on your data this month</p>
          <ul className="mt-4 space-y-3">
            {insights.map((ins) => (
              <li
                key={ins.id}
                className={`rounded-lg border border-zinc-800/60 border-l-4 bg-black/20 py-3 pl-4 pr-3 text-sm text-zinc-300 light:border-zinc-200 light:bg-zinc-50 light:text-zinc-700 ${insightBorderClass(ins.sentiment)}`}
              >
                {ins.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
