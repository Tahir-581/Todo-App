import type { TaskRecurrence } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

export function addRecurrence(from: Date, rule: TaskRecurrence): Date {
  switch (rule) {
    case "DAILY":
      return addDays(from, 1);
    case "WEEKLY":
      return addWeeks(from, 1);
    case "MONTHLY":
      return addMonths(from, 1);
    case "NONE":
      return from;
  }
}
