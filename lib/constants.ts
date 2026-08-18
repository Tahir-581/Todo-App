import type { TaskPriority, TaskRecurrence, TaskStatus } from "@prisma/client";

export const STATUS_ORDER: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "TODAY_DONE",
  "DONE",
  "CANCELLED",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  TODAY_DONE: "Today Done",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

/** True for terminal “finished” columns (kanban Done and Today Done). */
export function isCompletedTaskStatus(status: TaskStatus): boolean {
  return status === "DONE" || status === "TODAY_DONE";
}

export {
  STATUS_THEME,
  STATUS_HEADER_GLYPH,
  PRIORITY_COLORS,
  PRIORITY_BADGE,
  PRIORITY_CARD_LEFT,
  PRIORITY_WARMTH_BG,
  PRIORITY_DOT,
  PRIORITY_CALENDAR_CHIP,
  DASHBOARD_SECTION_THEME,
  FILTER_TOGGLE_ON,
  FILTER_TOGGLE_OFF,
} from "./task-themes";

export { PRIORITY_FILTER_STYLES as PRIORITY_FILTER } from "./label-chips";

export {
  LABEL_CHIP_DISPLAY,
  labelChipDisplayClasses,
  labelChipToggleClasses,
} from "./label-chips";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  NONE: "No priority",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Critical",
};

export const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  NONE: "Does not repeat",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export function taskDisplayId(taskRef: number) {
  return `TASK-${String(taskRef).padStart(3, "0")}`;
}
