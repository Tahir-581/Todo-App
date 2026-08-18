"use client";

import { useEffect, useMemo, useRef } from "react";
import { useProgressTrackerStore } from "@/store/progressTrackerStore";

type SyncPayload = {
  activities: unknown;
  checks: unknown;
  tzOffsetMinutes: number;
  timeZone: string;
};

function stableJsonSize(x: unknown): number {
  try {
    return JSON.stringify(x).length;
  } catch {
    return 0;
  }
}

export function useProgressTrackerSync(enabled = true) {
  const hydrated = useProgressTrackerStore((s) => s.hydrated);
  const activities = useProgressTrackerStore((s) => s.activities);
  const checks = useProgressTrackerStore((s) => s.checks);

  const payload: SyncPayload = useMemo(
    () => ({
      activities,
      checks,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    [activities, checks]
  );

  const lastSigRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);
  const didInitialPushRef = useRef(false);

  /** One immediate sync after hydration so server has reminders before user leaves the page. */
  useEffect(() => {
    if (!enabled || !hydrated || didInitialPushRef.current) return;
    didInitialPushRef.current = true;
    const t = window.setTimeout(() => {
      try {
        const { activities: a, checks: c } = useProgressTrackerStore.getState();
        const body = JSON.stringify({
          activities: a,
          checks: c,
          tzOffsetMinutes: new Date().getTimezoneOffset(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (body.length > 250_000) return;
        void fetch("/api/progress-tracker/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } catch {
        /* ignore */
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [enabled, hydrated]);

  useEffect(() => {
    if (!enabled) return;
    if (!hydrated) return;

    // Avoid excessive payload sizes (basic guard)
    const approxSize = stableJsonSize(payload);
    if (approxSize > 250_000) return;

    const checkKeysSig = Object.keys(checks || {})
      .sort()
      .join(",");
    const reminderSig = activities
      .map((a) => {
        const wd = [...(a.whatsappReminderWeekdays ?? [])].sort((x, y) => x - y).join(",");
        const ph = [...(a.whatsappReminderPhones ?? [])].sort().join(",");
        return `${a.id}:${a.whatsappReminderEnabled ? 1 : 0}:${a.whatsappReminderAtMinutes ?? ""}:${wd}:${ph}`;
      })
      .join("|");
    const sig = `${activities.length}:${checkKeysSig}:${approxSize}:${payload.timeZone}:${reminderSig}`;
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        await fetch("/api/progress-tracker/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // Best-effort sync; ignore failures
      }
    }, 800);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, hydrated, payload, activities, checks]);
}

