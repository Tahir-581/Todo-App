import type { TaskPriority, TaskStatus } from "@prisma/client";

/** Shared filter / toggle “selected” (generic accent) */
export const FILTER_TOGGLE_ON =
  "border-accent/40 bg-accent/[0.12] text-zinc-100 light:border-accent/45 light:bg-accent/10 light:text-zinc-900";

export const FILTER_TOGGLE_OFF =
  "border-zinc-700/80 text-zinc-500 hover:border-zinc-600 hover:bg-white/[0.04] hover:text-zinc-300 light:border-zinc-300 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-900";

const pill =
  "inline-flex items-center gap-1 rounded-full border border-solid px-[10px] py-0.5 text-[11px] font-semibold leading-none";

export const PRIORITY_BADGE: Record<TaskPriority, { icon: string; className: string }> = {
  URGENT: {
    icon: "↑↑",
    className: `${pill} border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.2)] text-[#fca5a5]`,
  },
  HIGH: {
    icon: "↑",
    className: `${pill} border-[rgba(251,146,60,0.35)] bg-[rgba(251,146,60,0.18)] text-[#fdba74]`,
  },
  MEDIUM: {
    icon: "→",
    className: `${pill} border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.15)] text-[#fde047]`,
  },
  LOW: {
    icon: "↓",
    className: `${pill} border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.15)] text-[#86efac]`,
  },
  NONE: {
    icon: "—",
    className: `${pill} border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.1)] text-[#94a3b8]`,
  },
};

/** @deprecated Prefer PRIORITY_BADGE — class-only map for legacy imports */
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  NONE: PRIORITY_BADGE.NONE.className,
  LOW: PRIORITY_BADGE.LOW.className,
  MEDIUM: PRIORITY_BADGE.MEDIUM.className,
  HIGH: PRIORITY_BADGE.HIGH.className,
  URGENT: PRIORITY_BADGE.URGENT.className,
};

export const PRIORITY_CARD_LEFT: Record<TaskPriority, string> = {
  NONE: "border-l-[3px] border-l-slate-500",
  LOW: "border-l-[3px] border-l-[#22c55e]",
  MEDIUM: "border-l-[3px] border-l-[#eab308]",
  HIGH: "border-l-[3px] border-l-[#ef4444]",
  URGENT: "border-l-[3px] border-l-[#ef4444]",
};

export const PRIORITY_WARMTH_BG = "bg-[rgba(251,146,60,0.03)]";

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  NONE: "bg-slate-500",
  LOW: "bg-[#22c55e]",
  MEDIUM: "bg-[#eab308]",
  HIGH: "bg-[#fb923c]",
  URGENT: "bg-[#ef4444]",
};

export const PRIORITY_CALENDAR_CHIP: Record<TaskPriority, string> = {
  NONE:
    "border border-[rgba(148,163,184,0.35)] bg-[rgba(148,163,184,0.12)] text-[#94a3b8]",
  LOW: "border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] text-[#86efac]",
  MEDIUM:
    "border border-[rgba(234,179,8,0.35)] bg-[rgba(234,179,8,0.12)] text-[#fde047]",
  HIGH:
    "border border-[rgba(251,146,60,0.35)] bg-[rgba(251,146,60,0.15)] text-[#fdba74]",
  URGENT:
    "border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.15)] text-[#fca5a5]",
};

type StatusThemeShape = {
  column: string;
  columnHeader: string;
  columnTitle: string;
  columnMeta: string;
  columnIconClass: string;
  droppable: string;
  addTaskHover: string;
  listSection: string;
  listHeaderRow: string;
  listTitle: string;
  listCount: string;
  listChevron: string;
  listDivider: string;
  cardBg: string;
  cardBorder: string;
  filterOn: string;
  filterOff: string;
  modalAccent: string;
};

const todo: StatusThemeShape = {
  column:
    "rounded-xl border-2 border-[#475569] bg-[rgba(71,85,105,0.06)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] light:border-slate-500 light:bg-slate-500/10",
  columnHeader:
    "border-t-[3px] border-t-[#475569] border-b border-[#475569]/40 bg-black/20 light:border-slate-300 light:bg-slate-100/80",
  columnTitle: "text-[#94a3b8] light:text-slate-600",
  columnMeta: "text-[#94a3b8]/85 light:text-slate-500",
  columnIconClass: "text-[#94a3b8]",
  droppable: "bg-[rgba(71,85,105,0.12)] ring-1 ring-[#475569]/30",
  addTaskHover:
    "hover:bg-[rgba(71,85,105,0.12)] hover:text-[#94a3b8] light:hover:bg-slate-200 light:hover:text-slate-700",
  listSection:
    "rounded-xl border-2 border-[#475569] bg-[rgba(71,85,105,0.06)] light:border-slate-400 light:bg-slate-50/90",
  listHeaderRow:
    "border-t-[3px] border-t-[#475569] hover:bg-[rgba(71,85,105,0.08)] light:hover:bg-slate-100",
  listTitle: "text-[#94a3b8] light:text-slate-700",
  listCount: "text-[#94a3b8]/90 light:text-slate-500",
  listChevron: "text-[#94a3b8]/80",
  listDivider: "border-[#475569]/35 light:border-slate-300",
  cardBg: "bg-[#121214] light:bg-white",
  cardBorder: "border-zinc-800/80 light:border-zinc-200",
  filterOn: "border-[#475569]/60 bg-[rgba(71,85,105,0.18)] text-[#94a3b8] font-medium",
  filterOff: FILTER_TOGGLE_OFF,
  modalAccent: "text-[#94a3b8]",
};

const inProgress: StatusThemeShape = {
  column:
    "rounded-xl border-2 border-[#3b82f6] bg-[rgba(59,130,246,0.06)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] light:border-blue-500 light:bg-blue-500/10",
  columnHeader:
    "border-t-[3px] border-t-[#3b82f6] border-b border-[#3b82f6]/40 bg-black/20 light:border-blue-200 light:bg-blue-50/90",
  columnTitle: "text-[#60a5fa] light:text-blue-600",
  columnMeta: "text-[#60a5fa]/85 light:text-blue-500",
  columnIconClass: "text-[#60a5fa]",
  droppable: "bg-[rgba(59,130,246,0.12)] ring-1 ring-[#3b82f6]/35",
  addTaskHover:
    "hover:bg-[rgba(59,130,246,0.12)] hover:text-[#60a5fa] light:hover:bg-blue-100 light:hover:text-blue-700",
  listSection:
    "rounded-xl border-2 border-[#3b82f6] bg-[rgba(59,130,246,0.06)] light:border-blue-400 light:bg-blue-50/80",
  listHeaderRow:
    "border-t-[3px] border-t-[#3b82f6] hover:bg-[rgba(59,130,246,0.1)] light:hover:bg-blue-100/80",
  listTitle: "text-[#60a5fa] light:text-blue-700",
  listCount: "text-[#60a5fa]/90 light:text-blue-500",
  listChevron: "text-[#60a5fa]/80",
  listDivider: "border-[#3b82f6]/35 light:border-blue-200",
  cardBg: "bg-[#121214] light:bg-white",
  cardBorder: "border-zinc-800/80 light:border-zinc-200",
  filterOn: "border-[#3b82f6]/55 bg-[rgba(59,130,246,0.18)] text-[#60a5fa] font-medium",
  filterOff: FILTER_TOGGLE_OFF,
  modalAccent: "text-[#60a5fa]",
};

const inReview: StatusThemeShape = {
  column:
    "rounded-xl border-2 border-[#f59e0b] bg-[rgba(245,158,11,0.06)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] light:border-amber-500 light:bg-amber-500/10",
  columnHeader:
    "border-t-[3px] border-t-[#f59e0b] border-b border-[#f59e0b]/40 bg-black/20 light:border-amber-200 light:bg-amber-50/90",
  columnTitle: "text-[#fbbf24] light:text-amber-700",
  columnMeta: "text-[#fbbf24]/85 light:text-amber-600",
  columnIconClass: "text-[#fbbf24]",
  droppable: "bg-[rgba(245,158,11,0.12)] ring-1 ring-[#f59e0b]/35",
  addTaskHover:
    "hover:bg-[rgba(245,158,11,0.12)] hover:text-[#fbbf24] light:hover:bg-amber-100 light:hover:text-amber-800",
  listSection:
    "rounded-xl border-2 border-[#f59e0b] bg-[rgba(245,158,11,0.06)] light:border-amber-400 light:bg-amber-50/80",
  listHeaderRow:
    "border-t-[3px] border-t-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] light:hover:bg-amber-100/80",
  listTitle: "text-[#fbbf24] light:text-amber-800",
  listCount: "text-[#fbbf24]/90 light:text-amber-600",
  listChevron: "text-[#fbbf24]/80",
  listDivider: "border-[#f59e0b]/35 light:border-amber-200",
  cardBg: "bg-[#121214] light:bg-white",
  cardBorder: "border-zinc-800/80 light:border-zinc-200",
  filterOn: "border-[#f59e0b]/55 bg-[rgba(245,158,11,0.18)] text-[#fbbf24] font-medium",
  filterOff: FILTER_TOGGLE_OFF,
  modalAccent: "text-[#fbbf24]",
};

/** Completed today — same family as Done, slightly brighter accent */
const todayDone: StatusThemeShape = {
  column:
    "rounded-xl border-2 border-[#10b981] bg-[rgba(16,185,129,0.07)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] light:border-emerald-500 light:bg-emerald-500/10",
  columnHeader:
    "border-t-[3px] border-t-[#10b981] border-b border-[#10b981]/40 bg-black/20 light:border-emerald-200 light:bg-emerald-50/90",
  columnTitle: "text-[#34d399] light:text-emerald-700",
  columnMeta: "text-[#34d399]/85 light:text-emerald-600",
  columnIconClass: "text-[#34d399]",
  droppable: "bg-[rgba(16,185,129,0.14)] ring-1 ring-[#10b981]/35",
  addTaskHover:
    "hover:bg-[rgba(16,185,129,0.14)] hover:text-[#34d399] light:hover:bg-emerald-100 light:hover:text-emerald-800",
  listSection:
    "rounded-xl border-2 border-[#10b981] bg-[rgba(16,185,129,0.07)] light:border-emerald-400 light:bg-emerald-50/80",
  listHeaderRow:
    "border-t-[3px] border-t-[#10b981] hover:bg-[rgba(16,185,129,0.1)] light:hover:bg-emerald-100/80",
  listTitle: "text-[#34d399] light:text-emerald-800",
  listCount: "text-[#34d399]/90 light:text-emerald-600",
  listChevron: "text-[#34d399]/80",
  listDivider: "border-[#10b981]/35 light:border-emerald-200",
  cardBg: "bg-[#121214] light:bg-white",
  cardBorder: "border-zinc-800/80 light:border-zinc-200",
  filterOn: "border-[#10b981]/55 bg-[rgba(16,185,129,0.2)] text-[#34d399] font-medium",
  filterOff: FILTER_TOGGLE_OFF,
  modalAccent: "text-[#34d399]",
};

const done: StatusThemeShape = {
  column:
    "rounded-xl border-2 border-[#22c55e] bg-[rgba(34,197,94,0.06)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] light:border-green-500 light:bg-green-500/10",
  columnHeader:
    "border-t-[3px] border-t-[#22c55e] border-b border-[#22c55e]/40 bg-black/20 light:border-green-200 light:bg-green-50/90",
  columnTitle: "text-[#4ade80] light:text-green-700",
  columnMeta: "text-[#4ade80]/85 light:text-green-600",
  columnIconClass: "text-[#4ade80]",
  droppable: "bg-[rgba(34,197,94,0.12)] ring-1 ring-[#22c55e]/35",
  addTaskHover:
    "hover:bg-[rgba(34,197,94,0.12)] hover:text-[#4ade80] light:hover:bg-green-100 light:hover:text-green-800",
  listSection:
    "rounded-xl border-2 border-[#22c55e] bg-[rgba(34,197,94,0.06)] light:border-green-400 light:bg-green-50/80",
  listHeaderRow:
    "border-t-[3px] border-t-[#22c55e] hover:bg-[rgba(34,197,94,0.1)] light:hover:bg-green-100/80",
  listTitle: "text-[#4ade80] light:text-green-800",
  listCount: "text-[#4ade80]/90 light:text-green-600",
  listChevron: "text-[#4ade80]/80",
  listDivider: "border-[#22c55e]/35 light:border-green-200",
  cardBg: "bg-[#121214] light:bg-white",
  cardBorder: "border-zinc-800/80 light:border-zinc-200",
  filterOn: "border-[#22c55e]/55 bg-[rgba(34,197,94,0.18)] text-[#4ade80] font-medium",
  filterOff: FILTER_TOGGLE_OFF,
  modalAccent: "text-[#4ade80]",
};

const cancelled: StatusThemeShape = {
  column:
    "rounded-xl border-2 border-[#f43f5e] bg-[rgba(244,63,94,0.06)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] light:border-rose-500 light:bg-rose-500/10",
  columnHeader:
    "border-t-[3px] border-t-[#f43f5e] border-b border-[#f43f5e]/40 bg-black/20 light:border-rose-200 light:bg-rose-50/90",
  columnTitle: "text-[#fb7185] light:text-rose-700",
  columnMeta: "text-[#fb7185]/85 light:text-rose-600",
  columnIconClass: "text-[#fb7185]",
  droppable: "bg-[rgba(244,63,94,0.12)] ring-1 ring-[#f43f5e]/35",
  addTaskHover:
    "hover:bg-[rgba(244,63,94,0.12)] hover:text-[#fb7185] light:hover:bg-rose-100 light:hover:text-rose-800",
  listSection:
    "rounded-xl border-2 border-[#f43f5e] bg-[rgba(244,63,94,0.06)] light:border-rose-400 light:bg-rose-50/80",
  listHeaderRow:
    "border-t-[3px] border-t-[#f43f5e] hover:bg-[rgba(244,63,94,0.1)] light:hover:bg-rose-100/80",
  listTitle: "text-[#fb7185] light:text-rose-800",
  listCount: "text-[#fb7185]/90 light:text-rose-600",
  listChevron: "text-[#fb7185]/80",
  listDivider: "border-[#f43f5e]/35 light:border-rose-200",
  cardBg: "bg-[#121214] light:bg-white",
  cardBorder: "border-zinc-800/80 light:border-zinc-200",
  filterOn: "border-[#f43f5e]/55 bg-[rgba(244,63,94,0.18)] text-[#fb7185] font-medium",
  filterOff: FILTER_TOGGLE_OFF,
  modalAccent: "text-[#fb7185]",
};

export const STATUS_THEME: Record<TaskStatus, StatusThemeShape> = {
  TODO: todo,
  IN_PROGRESS: inProgress,
  IN_REVIEW: inReview,
  TODAY_DONE: todayDone,
  DONE: done,
  CANCELLED: cancelled,
};

/** Kanban / list header glyphs (In Progress uses spinner in UI) */
export const STATUS_HEADER_GLYPH: Record<TaskStatus, string> = {
  TODO: "○",
  IN_PROGRESS: "",
  IN_REVIEW: "◎",
  TODAY_DONE: "✓",
  DONE: "✓",
  CANCELLED: "✕",
};

const dashShell =
  "rounded-xl border border-zinc-800/80 bg-surface/50 p-4 pl-5 light:border-zinc-200 light:bg-white";

export const DASHBOARD_SECTION_THEME = {
  today: {
    shell: `${dashShell} border-l-[3px] border-l-[#3b82f6]`,
    title: "text-sm font-medium text-[#60a5fa] light:text-blue-600",
    titleIcon: "☀️",
    item:
      "w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-zinc-200 hover:border-[#3b82f6]/35 hover:bg-[rgba(59,130,246,0.06)] light:text-zinc-900 light:hover:border-blue-200 light:hover:bg-blue-50/80",
  },
  overdue: {
    shell: `${dashShell} border-l-[3px] border-l-[#f43f5e]`,
    title: "text-sm font-medium text-[#fb7185] light:text-rose-600",
    titleIcon: "⚠️",
    item:
      "w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-zinc-200 hover:border-[#f43f5e]/35 hover:bg-[rgba(244,63,94,0.06)] light:text-zinc-900 light:hover:border-rose-200 light:hover:bg-rose-50/80",
  },
  upcoming: {
    shell: `${dashShell} border-l-[3px] border-l-[#8b5cf6]`,
    title: "text-sm font-medium text-[#c4b5fd] light:text-violet-700",
    titleIcon: "📅",
    item:
      "w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-zinc-200 hover:border-[#8b5cf6]/35 hover:bg-[rgba(139,92,246,0.08)] light:text-zinc-900 light:hover:border-violet-200 light:hover:bg-violet-50/80",
  },
} as const;
