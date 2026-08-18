"use client";

import { create } from "zustand";
import {
  PT_ACTIVITIES_KEY,
  PT_CHECKS_KEY,
  PT_MAX_ACTIVITIES,
  type PtActivity,
  type PtChecks,
} from "@/lib/progressTrackerTypes";
import { makeCheckKey, removeChecksForActivity } from "@/lib/progressTrackerUtils";

const ALL_WEEKDAYS_JS = [0, 1, 2, 3, 4, 5, 6] as const;

type ProgressTrackerState = {
  activities: PtActivity[];
  checks: PtChecks;
  hydrated: boolean;
  hydrate: () => void;
  addActivity: (name: string, color: string) => { ok: true } | { ok: false; reason: "max" | "empty" };
  removeActivity: (id: string) => void;
  reorderActivities: (orderedIds: string[]) => void;
  toggleCheck: (dateStr: string, activityId: string) => void;
  setChecked: (dateStr: string, activityId: string, checked: boolean) => void;
  setActivityWhatsAppReminder: (activityId: string, enabled: boolean) => void;
  setActivityWhatsAppReminderAt: (activityId: string, atMinutes: number | null) => void;
  setActivityWhatsAppReminderWeekdays: (activityId: string, weekdays: number[] | undefined) => void;
  toggleActivityWhatsAppReminderWeekday: (activityId: string, day0to6: number) => void;
  setActivityWhatsAppReminderPhones: (activityId: string, phones: string[] | undefined) => void;
};

function readFromStorage(): { activities: PtActivity[]; checks: PtChecks } {
  if (typeof window === "undefined") return { activities: [], checks: {} };
  try {
    const rawA = localStorage.getItem(PT_ACTIVITIES_KEY);
    const rawC = localStorage.getItem(PT_CHECKS_KEY);
    const activities = rawA ? JSON.parse(rawA) : [];
    const checksRaw = rawC ? JSON.parse(rawC) : {};
    const checks: PtChecks = {};
    if (checksRaw && typeof checksRaw === "object") {
      for (const k of Object.keys(checksRaw)) {
        if (checksRaw[k] === true) checks[k] = true;
      }
    }
    return {
      activities: Array.isArray(activities) ? activities : [],
      checks,
    };
  } catch {
    return { activities: [], checks: {} };
  }
}

function writeToStorage(activities: PtActivity[], checks: PtChecks) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PT_ACTIVITIES_KEY, JSON.stringify(activities));
  localStorage.setItem(PT_CHECKS_KEY, JSON.stringify(checks));
}

function newActivityId(): string {
  const part =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `act_${part}`;
}

export const useProgressTrackerStore = create<ProgressTrackerState>((set, get) => ({
  activities: [],
  checks: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const { activities, checks } = readFromStorage();
    set({ activities, checks, hydrated: true });
  },

  addActivity: (name, color) => {
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed) return { ok: false, reason: "empty" };
    const { activities, checks } = get();
    if (activities.length >= PT_MAX_ACTIVITIES) return { ok: false, reason: "max" };
    const next: PtActivity = {
      id: newActivityId(),
      name: trimmed,
      color,
      createdAt: new Date().toISOString(),
    };
    const list = [...activities, next];
    set({ activities: list });
    writeToStorage(list, checks);
    return { ok: true };
  },

  removeActivity: (id) => {
    const { activities, checks } = get();
    const list = activities.filter((a) => a.id !== id);
    const nextChecks = removeChecksForActivity(checks, id);
    set({ activities: list, checks: nextChecks });
    writeToStorage(list, nextChecks);
  },

  reorderActivities: (orderedIds) => {
    const { activities, checks } = get();
    const map = new Map(activities.map((a) => [a.id, a]));
    const list: PtActivity[] = [];
    for (const oid of orderedIds) {
      const a = map.get(oid);
      if (a) list.push(a);
    }
    for (const a of activities) {
      if (!list.find((x) => x.id === a.id)) list.push(a);
    }
    set({ activities: list });
    writeToStorage(list, checks);
  },

  toggleCheck: (dateStr, activityId) => {
    const { checks, activities } = get();
    const key = makeCheckKey(dateStr, activityId);
    const next: PtChecks = { ...checks };
    if (next[key] === true) {
      delete next[key];
    } else {
      next[key] = true;
    }
    set({ checks: next });
    writeToStorage(activities, next);
  },

  setChecked: (dateStr, activityId, checked) => {
    const { checks, activities } = get();
    const key = makeCheckKey(dateStr, activityId);
    const next: PtChecks = { ...checks };
    if (checked) next[key] = true;
    else delete next[key];
    set({ checks: next });
    writeToStorage(activities, next);
  },

  setActivityWhatsAppReminder: (activityId, enabled) => {
    const { activities, checks } = get();
    const list = activities.map((a) => {
      if (a.id !== activityId) return a;
      if (!enabled) {
        const {
          whatsappReminderAtMinutes: _t,
          whatsappReminderWeekdays: _w,
          whatsappReminderPhones: _p,
          ...rest
        } = a;
        return { ...rest, whatsappReminderEnabled: false };
      }
      return { ...a, whatsappReminderEnabled: true };
    });
    set({ activities: list });
    writeToStorage(list, checks);
  },

  setActivityWhatsAppReminderAt: (activityId, atMinutes) => {
    const { activities, checks } = get();
    const list = activities.map((a) => {
      if (a.id !== activityId) return a;
      if (atMinutes === null) {
        const { whatsappReminderAtMinutes: _t, ...rest } = a;
        return rest;
      }
      return { ...a, whatsappReminderAtMinutes: atMinutes };
    });
    set({ activities: list });
    writeToStorage(list, checks);
  },

  setActivityWhatsAppReminderWeekdays: (activityId, weekdays) => {
    const { activities, checks } = get();
    const list = activities.map((a) => {
      if (a.id !== activityId) return a;
      if (!weekdays || weekdays.length === 0 || weekdays.length === ALL_WEEKDAYS_JS.length) {
        const { whatsappReminderWeekdays: _w, ...rest } = a;
        return rest;
      }
      const uniq = [...new Set(weekdays.filter((d) => d >= 0 && d <= 6))].sort((x, y) => x - y);
      if (uniq.length === 0 || uniq.length === ALL_WEEKDAYS_JS.length) {
        const { whatsappReminderWeekdays: _w, ...rest } = a;
        return rest;
      }
      return { ...a, whatsappReminderWeekdays: uniq };
    });
    set({ activities: list });
    writeToStorage(list, checks);
  },

  toggleActivityWhatsAppReminderWeekday: (activityId, day0to6) => {
    const { activities, checks } = get();
    const a = activities.find((x) => x.id === activityId);
    if (!a) return;
    const base =
      a.whatsappReminderWeekdays && a.whatsappReminderWeekdays.length > 0
        ? [...a.whatsappReminderWeekdays]
        : [...ALL_WEEKDAYS_JS];
    const picked = new Set(base);
    if (picked.has(day0to6)) {
      if (picked.size <= 1) return;
      picked.delete(day0to6);
    } else {
      picked.add(day0to6);
    }
    const next = [...picked].sort((x, y) => x - y);
    const list = activities.map((act) => {
      if (act.id !== activityId) return act;
      if (next.length === ALL_WEEKDAYS_JS.length) {
        const { whatsappReminderWeekdays: _w, ...rest } = act;
        return rest;
      }
      return { ...act, whatsappReminderWeekdays: next };
    });
    set({ activities: list });
    writeToStorage(list, checks);
  },

  setActivityWhatsAppReminderPhones: (activityId, phones) => {
    const { activities, checks } = get();
    const list = activities.map((a) => {
      if (a.id !== activityId) return a;
      if (!phones || phones.length === 0) {
        const { whatsappReminderPhones: _p, ...rest } = a;
        return rest;
      }
      return { ...a, whatsappReminderPhones: phones };
    });
    set({ activities: list });
    writeToStorage(list, checks);
  },
}));
