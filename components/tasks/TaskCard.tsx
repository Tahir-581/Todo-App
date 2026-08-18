"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { isPast, isToday } from "date-fns";
import {
  isCompletedTaskStatus,
  labelChipDisplayClasses,
  PRIORITY_BADGE,
  PRIORITY_CARD_LEFT,
  PRIORITY_LABELS,
  PRIORITY_WARMTH_BG,
  STATUS_THEME,
  taskDisplayId,
} from "@/lib/constants";
import type { TaskListTask } from "@/store/taskStore";

export function TaskCard({
  task,
  onOpen,
  isDragging,
}: {
  task: TaskListTask;
  onOpen: () => void;
  isDragging?: boolean;
}) {
  const overdue =
    task.deadline &&
    !isCompletedTaskStatus(task.status) &&
    task.status !== "CANCELLED" &&
    isPast(new Date(task.deadline)) &&
    !isToday(new Date(task.deadline));

  const dueToday =
    task.deadline &&
    isToday(new Date(task.deadline)) &&
    !isCompletedTaskStatus(task.status) &&
    task.status !== "CANCELLED";

  const th = STATUS_THEME[task.status];
  const isDone = isCompletedTaskStatus(task.status);
  const isCancelled = task.status === "CANCELLED";

  const leftBorder = overdue
    ? "border-l-[3px] border-l-[#f43f5e]"
    : PRIORITY_CARD_LEFT[task.priority];

  const warmth =
    (task.priority === "HIGH" || task.priority === "URGENT") &&
    !isDone &&
    !isCancelled
      ? PRIORITY_WARMTH_BG
      : "";

  const pb = PRIORITY_BADGE[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isDragging ? 0.5 : isDone ? 0.6 : isCancelled ? 0.52 : 1,
        y: 0,
      }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 28 } }}
      className={`relative cursor-pointer rounded-xl border p-3 shadow-sm transition-shadow ${leftBorder} ${warmth} ${th.cardBg} ${th.cardBorder} ${
        overdue ? "pr-[5.5rem]" : ""
      } ${dueToday ? "ring-1 ring-amber-400/40" : ""}`}
      onClick={() => onOpen()}
    >
      {overdue ? (
        <span className="absolute right-2 top-2 rounded-full border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.2)] px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[#fca5a5]">
          OVERDUE
        </span>
      ) : null}
      <div className={`flex items-start justify-between gap-2 ${overdue ? "pr-1" : ""}`}>
        <p
          className={`min-w-0 flex-1 line-clamp-2 text-sm font-medium text-zinc-100 light:text-zinc-900 ${
            isDone ? "line-through decoration-zinc-500" : ""
          }`}
        >
          {task.title}
        </p>
        <span className="shrink-0 rounded-[4px] bg-[rgba(255,255,255,0.05)] px-1.5 py-px font-mono text-[10.5px] text-[#475569] light:bg-zinc-200/90 light:text-slate-600">
          {taskDisplayId(task.taskRef)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={pb.className}>
          <span aria-hidden>{pb.icon}</span>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.labels.slice(0, 3).map(({ label }) => (
          <span key={label.id} className={labelChipDisplayClasses(label.name)}>
            {label.name}
          </span>
        ))}
      </div>
      {task.deadline ? (
        <p className="mt-2 font-mono text-xs text-zinc-500">
          {format(new Date(task.deadline), "MMM d, HH:mm")}
        </p>
      ) : null}
      {task._count.subtasks > 0 ? (
        <p className="mt-1 text-xs text-zinc-600">
          {task.subtasks.filter((s) => s.completed).length}/{task._count.subtasks} subtasks
        </p>
      ) : null}
    </motion.div>
  );
}
