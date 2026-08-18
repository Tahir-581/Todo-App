"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  LayoutGrid,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { earliestDailyReportSendMinute, normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";
import { useProgressTrackerHydration, useProgressTrackerStore } from "@/hooks/useProgressTracker";
import { useProgressTrackerSync } from "@/hooks/useProgressTrackerSync";
import { useUiStore } from "@/store/uiStore";
import {
  PT_MAX_ACTIVITIES,
  PT_PRESET_COLORS,
  type PtActivity,
} from "@/lib/progressTrackerTypes";
import { resolveReminderSendMinutes } from "@/lib/progressActivityReminderWhatsApp";
import { dailyReportWhatsAppPhoneList } from "@/lib/whatsappReportPhones";
import {
  countCheckedDaysInMonth,
  completionRateColor,
  formatDateCell,
  getDaysInMonthGrid,
  isChecked,
  isWeekend,
  safeRatio,
  streakInMonthView,
  toDateStr,
} from "@/lib/progressTrackerUtils";
import { formatMinutesAs12h, hhmmToMinutesSinceMidnight, minutesSinceMidnightToHHMM } from "@/lib/reminderTime";
import { ProgressAnalytics } from "./ProgressAnalytics";

function SortableActivityHeader({
  activity,
  onRemoveClick,
  streak,
  onToggleWhatsAppReminder,
  scheduleDefaultMinutes,
}: {
  activity: PtActivity;
  onRemoveClick: (a: PtActivity) => void;
  streak: number;
  onToggleWhatsAppReminder: (activityId: string, enabled: boolean) => void;
  scheduleDefaultMinutes: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const waOn = Boolean(activity.whatsappReminderEnabled);
  const sendMins = resolveReminderSendMinutes(activity.whatsappReminderAtMinutes, scheduleDefaultMinutes);
  const usesCustomTime =
    activity.whatsappReminderAtMinutes != null &&
    activity.whatsappReminderAtMinutes !== scheduleDefaultMinutes;

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="group sticky top-0 z-20 min-w-[110px] max-w-[160px] border-b-2 border-transparent bg-[#161618] px-2 py-2 text-left align-bottom light:bg-white"
    >
      <div className="relative border-b-2 pb-2" style={{ borderColor: activity.color }}>
        <div className="flex items-start gap-1">
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 active:cursor-grabbing"
            aria-label="Reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1 pr-5">
            <p className="truncate text-xs font-semibold text-zinc-100 light:text-zinc-900">{activity.name}</p>
            {streak > 0 ? (
              <p className="mt-0.5 text-[10px] text-zinc-500">
                🔥 {streak} day streak
              </p>
            ) : null}
            <label
              className="mt-1 flex cursor-pointer flex-wrap items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-600"
              title="WhatsApp reminder: optional days & recipients in Manage Activities; time here or Settings default."
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={waOn}
                onChange={(e) => onToggleWhatsAppReminder(activity.id, e.target.checked)}
                className="h-3 w-3 rounded border-zinc-600 accent-teal-500"
              />
              <Bell className={`h-3 w-3 shrink-0 ${waOn ? "text-teal-400" : ""}`} aria-hidden />
              <span className="leading-none">WA daily</span>
              {waOn ? (
                <span className={`w-full pl-4 text-[9px] ${usesCustomTime ? "text-teal-500/90" : "text-zinc-600"}`}>
                  {formatMinutesAs12h(sendMins)}
                  {usesCustomTime ? "" : " · default"}
                </span>
              ) : null}
            </label>
          </div>
          <button
            type="button"
            onClick={() => onRemoveClick(activity)}
            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded text-zinc-500 opacity-0 transition-opacity hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
            aria-label={`Remove ${activity.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </th>
  );
}

function CheckCell({
  checked,
  color,
  onToggle,
}: {
  checked: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <td className="border-b border-zinc-800/50 p-0 light:border-zinc-200">
      <button
        type="button"
        onClick={onToggle}
        className="group/cell flex h-11 w-full min-w-[110px] max-w-[160px] items-center justify-center transition-colors hover:bg-white/[0.03] light:hover:bg-zinc-100/80"
        onMouseEnter={(e) => {
          if (!checked) {
            e.currentTarget.style.backgroundColor = `${color}18`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "";
        }}
      >
        <motion.span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white transition-[border-color,opacity]"
          animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.15 }}
          style={
            checked
              ? { backgroundColor: color, border: "none" }
              : {
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  opacity: 0.45,
                  background: "transparent",
                }
          }
        >
          {checked ? "✓" : ""}
        </motion.span>
      </button>
    </td>
  );
}

export function ProgressTracker() {
  useProgressTrackerHydration();
  useProgressTrackerSync(true);
  const activities = useProgressTrackerStore((s) => s.activities);
  const checks = useProgressTrackerStore((s) => s.checks);
  const toggleCheck = useProgressTrackerStore((s) => s.toggleCheck);
  const addActivity = useProgressTrackerStore((s) => s.addActivity);
  const removeActivity = useProgressTrackerStore((s) => s.removeActivity);
  const reorderActivities = useProgressTrackerStore((s) => s.reorderActivities);
  const setActivityWhatsAppReminder = useProgressTrackerStore((s) => s.setActivityWhatsAppReminder);
  const setActivityWhatsAppReminderAt = useProgressTrackerStore((s) => s.setActivityWhatsAppReminderAt);
  const toggleActivityWhatsAppReminderWeekday = useProgressTrackerStore((s) => s.toggleActivityWhatsAppReminderWeekday);
  const setActivityWhatsAppReminderWeekdays = useProgressTrackerStore((s) => s.setActivityWhatsAppReminderWeekdays);
  const setActivityWhatsAppReminderPhones = useProgressTrackerStore((s) => s.setActivityWhatsAppReminderPhones);

  const [scheduleDefaultMins, setScheduleDefaultMins] = useState(540);
  const [savedWaPhones, setSavedWaPhones] = useState<string[]>([]);
  const [testReminderLoading, setTestReminderLoading] = useState(false);
  const showToast = useUiStore((s) => s.showToast);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(() => new Date().getMonth());
  const [manageOpen, setManageOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(PT_PRESET_COLORS[0]);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<PtActivity | null>(null);

  const today = new Date();
  const monthDays = useMemo(
    () => getDaysInMonthGrid(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );
  const daysInMonth = monthDays.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = activities.map((a) => a.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      reorderActivities(arrayMove(ids, oldIndex, newIndex));
    },
    [activities, reorderActivities]
  );

  const monthLabel = format(new Date(viewYear, viewMonthIndex, 1), "MMMM yyyy");

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonthIndex + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonthIndex(d.getMonth());
  };

  const openAdd = () => {
    setAddError(null);
    setNewName("");
    setNewColor(PT_PRESET_COLORS[0]);
    setAddOpen(true);
  };

  const submitAdd = () => {
    setAddError(null);
    const res = addActivity(newName, newColor);
    if (!res.ok) {
      if (res.reason === "max") setAddError(`You can track at most ${PT_MAX_ACTIVITIES} activities.`);
      else setAddError("Enter an activity name.");
      return;
    }
    setAddOpen(false);
    setNewName("");
  };

  const confirmRemove = () => {
    if (pendingRemove) removeActivity(pendingRemove.id);
    setPendingRemove(null);
  };

  const sendTestActivityReminder = async () => {
    setTestReminderLoading(true);
    try {
      const res = await fetch("/api/progress-tracker/activity-reminder/send-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({
          title: "Test reminder failed",
          body: typeof data?.error === "string" ? data.error : res.statusText,
        });
        return;
      }
      showToast({
        title: "Test reminder sent",
        body: `Sent “${data.activityName ?? "activity"}” to ${data.recipientCount ?? 0} number(s).`,
      });
    } catch {
      showToast({ title: "Test reminder failed", body: "Network error." });
    } finally {
      setTestReminderLoading(false);
    }
  };

  const streakFor = (id: string) =>
    streakInMonthView(id, checks, viewYear, viewMonthIndex, today);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          fetch("/api/user"),
          fetch("/api/notifications/whatsapp-recipients"),
        ]);
        const u = await uRes.json().catch(() => null);
        const r = await rRes.json().catch(() => null);
        if (cancelled) return;
        if (u && Array.isArray(u.dailyReportSendMinutes)) {
          const n = earliestDailyReportSendMinute(normalizeDailyReportSendMinutes(u.dailyReportSendMinutes));
          setScheduleDefaultMins(n);
        }
        const extras = Array.isArray(r?.recipients)
          ? (r.recipients as { phone: string }[]).map((x) => ({ phone: x.phone }))
          : [];
        const phones = dailyReportWhatsAppPhoneList(
          typeof u?.whatsappPhone === "string" ? u.whatsappPhone : null,
          extras
        );
        setSavedWaPhones(phones);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weekdaySelected = (a: PtActivity, day: number) => {
    const w = a.whatsappReminderWeekdays;
    if (!w || w.length === 0) return true;
    return w.includes(day);
  };

  const waRecipientSelected = (a: PtActivity, phone: string) => {
    const p = a.whatsappReminderPhones;
    if (!p || p.length === 0) return true;
    return p.includes(phone);
  };

  const toggleWaRecipient = (activityId: string, phone: string) => {
    const all = savedWaPhones;
    if (all.length <= 1) return;
    const a = activities.find((x) => x.id === activityId);
    if (!a) return;
    const cur =
      a.whatsappReminderPhones && a.whatsappReminderPhones.length > 0
        ? a.whatsappReminderPhones.filter((p) => all.includes(p))
        : [...all];
    const set = new Set(cur);
    if (set.has(phone)) set.delete(phone);
    else set.add(phone);
    let next = [...set];
    if (next.length === 0) next = [...all];
    const nextSet = new Set(next);
    const coversAll = all.length > 0 && all.every((p) => nextSet.has(p)) && next.length === all.length;
    if (coversAll) setActivityWhatsAppReminderPhones(activityId, undefined);
    else setActivityWhatsAppReminderPhones(activityId, next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-10"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-100 light:text-zinc-900">
            Progress Tracker
          </h1>
          <p className="mt-1 text-zinc-500">Track your daily habits and activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setManageOpen((v) => !v)}>
            Manage Activities
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-zinc-700 bg-transparent p-2 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-white/5 hover:text-white light:border-zinc-300 light:text-zinc-700 light:hover:bg-zinc-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-base font-semibold text-zinc-100 light:text-zinc-900">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-zinc-700 bg-transparent p-2 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-white/5 hover:text-white light:border-zinc-300 light:text-zinc-700 light:hover:bg-zinc-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {manageOpen ? (
        <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
          <h2 className="text-sm font-medium text-zinc-200 light:text-zinc-900">Your activities</h2>
          <ul className="mt-3 space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 border-b border-zinc-800/50 py-2 text-sm text-zinc-400 last:border-0 light:border-zinc-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="min-w-0 flex-1 font-medium text-zinc-200 light:text-zinc-800">{a.name}</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-500">
                    <input
                      type="checkbox"
                      checked={Boolean(a.whatsappReminderEnabled)}
                      onChange={(e) => setActivityWhatsAppReminder(a.id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-zinc-600 accent-teal-500"
                    />
                    <span>WhatsApp reminder</span>
                  </label>
                </div>
                {a.whatsappReminderEnabled ? (
                  <div className="space-y-3 pl-5 text-[11px] text-zinc-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="shrink-0 text-zinc-500">Send at</span>
                      <input
                        type="time"
                        className="rounded border border-zinc-700 bg-transparent px-2 py-1 text-zinc-200 light:border-zinc-300 light:text-zinc-900"
                        value={minutesSinceMidnightToHHMM(
                          resolveReminderSendMinutes(a.whatsappReminderAtMinutes, scheduleDefaultMins)
                        )}
                        onChange={(e) => {
                          const v = hhmmToMinutesSinceMidnight(e.target.value);
                          if (v === null) return;
                          setActivityWhatsAppReminderAt(a.id, v === scheduleDefaultMins ? null : v);
                        }}
                      />
                      <span className="text-zinc-600">({formatMinutesAs12h(scheduleDefaultMins)} default)</span>
                      {a.whatsappReminderAtMinutes != null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto py-1 text-xs text-teal-400"
                          onClick={() => setActivityWhatsAppReminderAt(a.id, null)}
                        >
                          Use default time
                        </Button>
                      ) : null}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-zinc-500">Days</span>
                        {(
                          [
                            [0, "Sun"],
                            [1, "Mon"],
                            [2, "Tue"],
                            [3, "Wed"],
                            [4, "Thu"],
                            [5, "Fri"],
                            [6, "Sat"],
                          ] as const
                        ).map(([d, label]) => {
                          const on = weekdaySelected(a, d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleActivityWhatsAppReminderWeekday(a.id, d)}
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                on
                                  ? "border-teal-500/60 bg-teal-500/15 text-teal-200 light:text-teal-900"
                                  : "border-zinc-700 text-zinc-600 opacity-70 light:border-zinc-300"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="text-[10px] text-teal-400 hover:underline"
                          onClick={() => setActivityWhatsAppReminderWeekdays(a.id, undefined)}
                        >
                          Every day
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Uses your daily report time zone. Leave all highlighted for every day.
                      </p>
                    </div>
                    <div>
                      <span className="block text-zinc-500">WhatsApp recipients</span>
                      {savedWaPhones.length === 0 ? (
                        <p className="mt-1 text-[10px] text-amber-500/90">
                          Add a number under Settings → WhatsApp (or extra recipients) to receive reminders.
                        </p>
                      ) : savedWaPhones.length === 1 ? (
                        <p className="mt-1 text-[10px] text-zinc-600">
                          Sends to {savedWaPhones[0]} (only number on file).
                        </p>
                      ) : (
                        <div className="mt-1 flex flex-col gap-1.5">
                          {savedWaPhones.map((phone) => (
                            <label
                              key={phone}
                              className="flex cursor-pointer items-center gap-2 text-[10px] text-zinc-400 light:text-zinc-600"
                            >
                              <input
                                type="checkbox"
                                checked={waRecipientSelected(a, phone)}
                                onChange={() => toggleWaRecipient(a.id, phone)}
                                className="h-3 w-3 rounded border-zinc-600 accent-teal-500"
                              />
                              <span className="font-mono text-[10px]">{phone}</span>
                            </label>
                          ))}
                          <p className="text-[10px] text-zinc-600">
                            All checked = everyone; uncheck to limit this activity only.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
            {activities.length === 0 ? <li className="text-zinc-500">No activities yet.</li> : null}
          </ul>
          {activities.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-zinc-500">
                Numbers must be saved in Settings (primary + extra). Each activity can pick which days, which
                numbers, and its own send time; &quot;Use default time&quot; matches Daily progress (
                {formatMinutesAs12h(scheduleDefaultMins)}). Scheduled sends only run when something calls{" "}
                <code className="text-zinc-400">/api/cron/progress-tracker/daily-report</code> with your{" "}
                <code className="text-zinc-400">CRON_SECRET</code> (GET or POST)—for example every minute on Vercel Pro (
                <code className="text-zinc-400">vercel.json</code>); locally <code className="text-zinc-400">npm run dev</code>{" "}
                runs a poller. Skipped if you already checked that day.
              </p>
              <Button
                type="button"
                variant="outline"
                loading={testReminderLoading}
                disabled={activities.every((a) => !a.whatsappReminderEnabled)}
                onClick={sendTestActivityReminder}
              >
                Send test WhatsApp reminder now
              </Button>
            </div>
          ) : null}
          <Button type="button" variant="ghost" className="mt-4 text-teal-400" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Activity
          </Button>
        </div>
      ) : null}

      <div className="max-h-[70vh] overflow-x-auto overflow-y-auto rounded-xl border border-zinc-800/80 bg-surface/30 light:border-zinc-200 light:bg-white">
        {activities.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <LayoutGrid className="h-14 w-14 text-zinc-600" strokeWidth={1} />
            <div>
              <h2 className="text-lg font-semibold text-zinc-200 light:text-zinc-900">No activities yet</h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Add your first activity to start tracking your daily habits.
              </p>
            </div>
            <Button type="button" onClick={openAdd}>
              Add your first activity
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <table className="w-max min-w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="sticky left-0 top-0 z-30 w-[130px] min-w-[130px] border-b border-zinc-800/80 bg-[#161618] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 light:border-zinc-200 light:bg-white"
                    style={{ boxShadow: "4px 0 12px -4px rgba(0,0,0,0.4)" }}
                  >
                    Date
                  </th>
                  <SortableContext items={activities.map((a) => a.id)} strategy={horizontalListSortingStrategy}>
                    {activities.map((a) => (
                      <SortableActivityHeader
                        key={a.id}
                        activity={a}
                        streak={streakFor(a.id)}
                        onRemoveClick={setPendingRemove}
                        onToggleWhatsAppReminder={setActivityWhatsAppReminder}
                        scheduleDefaultMinutes={scheduleDefaultMins}
                      />
                    ))}
                  </SortableContext>
                  <th className="sticky top-0 z-20 min-w-[100px] border-b-2 border-transparent bg-[#161618] px-2 py-2 align-bottom light:bg-white">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-center gap-1 py-2 text-xs text-teal-400 hover:text-teal-300"
                      onClick={openAdd}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthDays.map((d, rowIdx) => {
                  const ds = toDateStr(d);
                  const d0 = startOfDay(d);
                  const t0 = startOfDay(today);
                  const isToday = isSameDay(d0, t0);
                  const isPast = isBefore(d0, t0);
                  const isFuture = isAfter(d0, t0);
                  const alt = rowIdx % 2 === 1;
                  return (
                    <tr
                      key={ds}
                      className={`${alt ? "bg-white/[0.02] light:bg-zinc-50/50" : ""} ${
                        isToday
                          ? "border-l-[3px] border-l-teal-500 bg-teal-500/[0.08] light:bg-teal-500/10"
                          : ""
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 w-[130px] min-w-[130px] border-b border-zinc-800/50 bg-[#161618] px-3 py-0 light:border-zinc-200 light:bg-white ${
                          isToday ? "font-bold text-teal-400" : isWeekend(d) ? "text-zinc-500" : "text-zinc-300"
                        } ${isPast && !isToday ? "opacity-[0.55]" : ""} light:text-zinc-800`}
                        style={{
                          boxShadow: isToday ? undefined : "4px 0 12px -4px rgba(0,0,0,0.35)",
                        }}
                      >
                        <div className="flex h-11 items-center text-sm">{formatDateCell(d)}</div>
                      </td>
                      {activities.map((a) => {
                        const checked = isChecked(checks, ds, a.id);
                        return (
                          <CheckCell
                            key={a.id}
                            checked={checked}
                            color={a.color}
                            onToggle={() => toggleCheck(ds, a.id)}
                          />
                        );
                      })}
                      <td className="border-b border-zinc-800/50 bg-transparent light:border-zinc-200" />
                    </tr>
                  );
                })}
                <tr className="border-t border-zinc-700/80 bg-black/20 light:border-zinc-200 light:bg-zinc-100/80">
                  <td
                    className="sticky left-0 z-10 bg-[#161618] px-3 py-3 text-sm font-medium text-zinc-400 light:bg-white"
                    style={{ boxShadow: "4px 0 12px -4px rgba(0,0,0,0.35)" }}
                  >
                    Month Total
                  </td>
                  {activities.map((a) => {
                    const x = countCheckedDaysInMonth(a.id, checks, monthDays);
                    const rate = safeRatio(x, daysInMonth);
                    const tier = completionRateColor(rate);
                    const colorCls =
                      tier === "green"
                        ? "text-emerald-400"
                        : tier === "amber"
                          ? "text-amber-400"
                          : "text-red-400";
                    return (
                      <td
                        key={a.id}
                        className="min-w-[110px] max-w-[160px] border-t border-zinc-700/80 px-2 py-3 text-center text-xs text-zinc-400 light:border-zinc-200"
                      >
                        <span className={colorCls}>
                          {x} / {daysInMonth}
                        </span>{" "}
                        <span className="text-zinc-500">days</span>
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </DndContext>
        )}
      </div>

      <ProgressAnalytics
        activities={activities}
        checks={checks}
        viewYear={viewYear}
        viewMonthIndex={viewMonthIndex}
        today={today}
      />

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#161618] p-6 shadow-xl light:border-zinc-200 light:bg-white">
            <h3 className="text-lg font-semibold text-zinc-100 light:text-zinc-900">New activity</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Name</label>
                <Input
                  value={newName}
                  maxLength={30}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Activity name"
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Color</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PT_PRESET_COLORS.map((c) => {
                    const sel = newColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                          sel ? "ring-2 ring-white ring-offset-2 ring-offset-[#161618] light:ring-offset-white" : ""
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    );
                  })}
                </div>
              </div>
              {addError ? <p className="text-sm text-amber-400">{addError}</p> : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitAdd}>
                Add Activity
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#161618] p-6 shadow-xl light:border-zinc-200 light:bg-white">
            <h3 className="text-lg font-semibold text-zinc-100 light:text-zinc-900">Remove activity?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove &apos;{pendingRemove.name}&apos;? All progress data for this activity will be deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPendingRemove(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={confirmRemove}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
