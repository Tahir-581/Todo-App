import type { IdeaStatusApi } from "./types";

/** Column order for Kanban and filter chips. */
export const IDEA_STATUS_ORDER: IdeaStatusApi[] = [
  "parked",
  "priority",
  "in-progress",
  "completed",
  "archived",
];

export const IDEA_STATUS_LABEL: Record<IdeaStatusApi, string> = {
  parked: "Parked",
  priority: "Priority",
  "in-progress": "In progress",
  completed: "Completed",
  archived: "Archived",
};

export const IDEA_STATUS_EMOJI: Record<IdeaStatusApi, string> = {
  parked: "🅿️",
  priority: "⭐",
  "in-progress": "🚀",
  completed: "✅",
  archived: "🗑",
};

/** Tailwind classes for column chrome (matches app dark/light tokens). */
export const IDEA_STATUS_COLUMN_THEME: Record<
  IdeaStatusApi,
  { column: string; header: string; title: string; meta: string; droppable: string }
> = {
  parked: {
    column: "rounded-xl border border-slate-700/60 bg-slate-900/20 light:border-slate-300 light:bg-slate-50",
    header: "border-b border-slate-700/50 bg-slate-900/30 light:border-slate-200 light:bg-slate-100/80",
    title: "text-slate-200 light:text-slate-800",
    meta: "text-slate-500",
    droppable: "bg-slate-500/10 ring-1 ring-slate-500/30",
  },
  priority: {
    column: "rounded-xl border border-amber-600/40 bg-amber-950/15 light:border-amber-300 light:bg-amber-50",
    header: "border-b border-amber-700/30 bg-amber-950/25 light:border-amber-200 light:bg-amber-100/80",
    title: "text-amber-100 light:text-amber-950",
    meta: "text-amber-200/80 light:text-amber-800",
    droppable: "bg-amber-500/10 ring-1 ring-amber-500/35",
  },
  "in-progress": {
    column: "rounded-xl border border-sky-600/40 bg-sky-950/20 light:border-sky-300 light:bg-sky-50",
    header: "border-b border-sky-700/30 bg-sky-950/30 light:border-sky-200 light:bg-sky-100/80",
    title: "text-sky-100 light:text-sky-950",
    meta: "text-sky-200/80 light:text-sky-800",
    droppable: "bg-sky-500/10 ring-1 ring-sky-500/35",
  },
  completed: {
    column: "rounded-xl border border-emerald-700/40 bg-emerald-950/15 light:border-emerald-300 light:bg-emerald-50",
    header: "border-b border-emerald-800/30 bg-emerald-950/25 light:border-emerald-200 light:bg-emerald-100/80",
    title: "text-emerald-100 light:text-emerald-950",
    meta: "text-emerald-200/80 light:text-emerald-800",
    droppable: "bg-emerald-500/10 ring-1 ring-emerald-500/35",
  },
  archived: {
    column: "rounded-xl border border-zinc-700/50 bg-zinc-900/25 light:border-zinc-300 light:bg-zinc-100",
    header: "border-b border-zinc-700/40 bg-zinc-900/40 light:border-zinc-200 light:bg-zinc-200/60",
    title: "text-zinc-300 light:text-zinc-800",
    meta: "text-zinc-500",
    droppable: "bg-zinc-500/10 ring-1 ring-zinc-500/25",
  },
};
