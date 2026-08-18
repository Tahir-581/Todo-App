import { makeCheckKey } from "@/lib/progressTrackerUtils";
import { validateWhatsAppE164 } from "@/lib/whatsappReportPhones";

export type ParsedPtActivityForReminder = {
  id: string;
  name: string;
  whatsappReminderEnabled: boolean;
  /** Resolved send time; falls back to user default when missing or invalid. */
  reminderSendMinutes: number;
  /** null = all days (0–6 Sun–Sat in report timezone). */
  reminderWeekdays: number[] | null;
  /** null = all configured account numbers; otherwise subset (E.164). */
  reminderPhones: string[] | null;
};

export function resolveReminderSendMinutes(
  atMinutes: number | null | undefined,
  userDefaultMinutes: number
): number {
  const d = Math.max(0, Math.min(1439, Math.floor(userDefaultMinutes)));
  if (typeof atMinutes !== "number" || !Number.isFinite(atMinutes)) return d;
  const n = Math.floor(atMinutes);
  if (n < 0 || n > 1439) return d;
  return n;
}

export function normalizeReminderWeekdays(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const set = new Set<number>();
  for (const x of raw) {
    if (typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 6) set.add(x);
  }
  if (set.size === 0) return null;
  return [...set].sort((a, b) => a - b);
}

export function normalizeReminderPhones(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const v = validateWhatsAppE164(x);
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  if (out.length === 0) return null;
  return out;
}

export function isReminderWeekdayAllowed(weekdayJs: number, configured: number[] | null): boolean {
  if (configured === null) return true;
  return configured.includes(weekdayJs);
}

/** Activity-specific list, intersected with account numbers; empty intersection falls back to all global. */
export function resolveActivityReminderRecipientPhones(
  activityPhones: string[] | null,
  globalPhones: string[]
): string[] {
  if (globalPhones.length === 0) return [];
  if (activityPhones === null) return [...globalPhones];
  const gSet = new Set(globalPhones);
  const filtered = activityPhones.filter((p) => gSet.has(p));
  if (filtered.length === 0) return [...globalPhones];
  return filtered;
}

export function parseProgressActivitiesForReminders(
  activitiesJson: string | null | undefined,
  userDefaultReminderMinutes: number
): ParsedPtActivityForReminder[] {
  if (!activitiesJson) return [];
  try {
    const raw = JSON.parse(activitiesJson) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: ParsedPtActivityForReminder[] = [];
    for (const x of raw) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      if (typeof o.id !== "string" || typeof o.name !== "string") continue;
      const atRaw = o.whatsappReminderAtMinutes;
      const atMinutes =
        typeof atRaw === "number"
          ? atRaw
          : atRaw === null
            ? null
            : undefined;
      out.push({
        id: o.id,
        name: String(o.name).slice(0, 60),
        whatsappReminderEnabled: o.whatsappReminderEnabled === true,
        reminderSendMinutes: resolveReminderSendMinutes(atMinutes, userDefaultReminderMinutes),
        reminderWeekdays: normalizeReminderWeekdays(o.whatsappReminderWeekdays),
        reminderPhones: normalizeReminderPhones(o.whatsappReminderPhones),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function parseProgressChecksJson(checksJson: string | null | undefined): Record<string, true> {
  if (!checksJson) return {};
  try {
    const raw = JSON.parse(checksJson) as unknown;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, true> = {};
    for (const k of Object.keys(raw as object)) {
      if ((raw as Record<string, unknown>)[k] === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function isActivityCheckedOnDate(
  checks: Record<string, true>,
  dateStr: string,
  activityId: string
): boolean {
  return checks[makeCheckKey(dateStr, activityId)] === true;
}

export function buildProgressActivityReminderMessage(activityName: string): string {
  const safeName = activityName.trim().slice(0, 500);
  const lines = ["*TASK REMINDER*", "", `Task: ${safeName}`];
  const text = lines.join("\n");
  return text.length > 4000 ? `${text.slice(0, 3997)}...` : text;
}

export function anyActivityHasWhatsAppReminder(activitiesJson: string): boolean {
  return parseProgressActivitiesForReminders(activitiesJson, 0).some((a) => a.whatsappReminderEnabled);
}
