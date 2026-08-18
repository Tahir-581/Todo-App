"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { addRecurrence } from "@/lib/recurrence";
import { startReminderAlarm } from "@/lib/reminderAlarm";
import { REMINDER_CHECK_INTERVAL_MS, REMINDER_SNOOZE_MS } from "@/lib/reminder";
import { useTaskStore } from "@/store/taskStore";
import type { TaskRecurrence } from "@prisma/client";
import { useUiStore } from "@/store/uiStore";

const LS_PREFIX = "reminder_fired_";

export function useReminderChecker() {
  const { status } = useSession();
  const tasks = useTaskStore((s) => s.tasks);
  const patchTask = useTaskStore((s) => s.patchTask);
  const showToast = useUiStore((s) => s.showToast);
  const dismissToast = useUiStore((s) => s.dismissToast);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== "authenticated") return;

    const tick = async () => {
      const now = Date.now();
      for (const t of tasks) {
        if (!t.reminderAt) continue;
        if (t.status === "DONE" || t.status === "TODAY_DONE" || t.status === "CANCELLED") continue;
        const at = new Date(t.reminderAt).getTime();
        if (Number.isNaN(at) || at > now) continue;
        const snoozeUntil = t.reminderSnoozedUntil
          ? new Date(t.reminderSnoozedUntil).getTime()
          : 0;
        if (snoozeUntil && snoozeUntil > now) continue;
        const lsKey = LS_PREFIX + t.id;
        if (typeof window !== "undefined" && localStorage.getItem(lsKey)) continue;
        if (firedRef.current.has(t.id)) continue;
        firedRef.current.add(t.id);

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "default"
        ) {
          await Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
          new Notification("Reminder", { 
            body: t.title,
            requireInteraction: true,
          });
        }

        const reminderRule = (t.reminderRecurrence ?? "NONE") as TaskRecurrence;
        const stopAlarm = startReminderAlarm();
        if (reminderRule !== "NONE" && t.reminderAt) {
          const next = addRecurrence(new Date(t.reminderAt), reminderRule);
          try {
            const res = await fetch(`/api/tasks/${t.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reminderAt: next.toISOString() }),
            });
            if (res.ok) {
              patchTask(t.id, { reminderAt: next.toISOString() });
            }
          } finally {
            firedRef.current.delete(t.id);
          }
        }

        showToast({
          title: "Reminder",
          body: t.title,
          onStopAlarm: () => stopAlarm?.(),
          onFullDismiss: () => {
            if (reminderRule === "NONE") {
              localStorage.setItem(LS_PREFIX + t.id, "1");
            }
            firedRef.current.delete(t.id);
          },
          actions: (
            <>
              <Button
                variant="outline"
                className="px-2 py-1 text-xs"
                onClick={async () => {
                  const until = new Date(Date.now() + REMINDER_SNOOZE_MS).toISOString();
                  await fetch(`/api/tasks/${t.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reminderSnoozedUntil: until }),
                  });
                  patchTask(t.id, { reminderSnoozedUntil: until });
                  firedRef.current.delete(t.id);
                  dismissToast("snooze");
                }}
              >
                Snooze 10m
              </Button>
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => dismissToast()}
              >
                Dismiss
              </Button>
            </>
          ),
        });
      }
    };

    const id = setInterval(tick, REMINDER_CHECK_INTERVAL_MS);
    tick();
    return () => clearInterval(id);
  }, [status, tasks, patchTask, showToast, dismissToast]);
}
