export type PtActivity = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  /** When true, server cron sends a daily WhatsApp nudge for this activity (if WhatsApp is set up). */
  whatsappReminderEnabled?: boolean;
  /**
   * Minutes after midnight in your report timezone (same as Settings → Daily progress time zone).
   * Omit or null to use account default (earliest time in Settings → daily report send times).
   */
  whatsappReminderAtMinutes?: number | null;
  /**
   * Days (in your report timezone) when the WhatsApp reminder may run. Uses JS convention: 0 = Sunday … 6 = Saturday.
   * Omit or empty = every day.
   */
  whatsappReminderWeekdays?: number[];
  /**
   * Subset of your saved WhatsApp numbers (Settings primary + extra recipients) for this activity only.
   * Omit or empty = send to all saved numbers.
   */
  whatsappReminderPhones?: string[];
};

/** Only `true` entries are persisted; missing key = unchecked */
export type PtChecks = Record<string, true>;

export type DailyStats = {
  day: number;
  dateStr: string;
  label: string;
  completed: number;
  total: number;
  ratio: number;
  isFuture: boolean;
  isToday: boolean;
};

export type WeeklyStats = {
  weekIndex: number;
  label: string;
  startStr: string;
  endStr: string;
  totalCompletions: number;
  activityCount: number;
  daysInWeek: number;
  avgPerDay: number;
};

export type InsightSentiment = "positive" | "warning" | "critical";

export type InsightItem = {
  id: string;
  text: string;
  sentiment: InsightSentiment;
};

export const PT_ACTIVITIES_KEY = "pt_activities";
export const PT_CHECKS_KEY = "pt_checks";

export const PT_PRESET_COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#f97316",
] as const;

export const PT_MAX_ACTIVITIES = 12;
