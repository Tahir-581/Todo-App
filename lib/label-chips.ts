import type { TaskPriority } from "@prisma/client";

/** Category/tag chip base (11.5px, 6px radius) — add border + colors via rules */
const chipBase =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11.5px] font-medium leading-tight transition-colors";

const defaultChip =
  "border-zinc-600/35 bg-white/[0.04] text-zinc-400 light:border-zinc-300 light:bg-zinc-100/90 light:text-zinc-600";

const rules: { test: RegExp; className: string }[] = [
  {
    test: /work|professional|business/i,
    className: "border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.15)] text-[#c4b5fd]",
  },
  {
    test: /personal/i,
    className: "border-[rgba(236,72,153,0.3)] bg-[rgba(236,72,153,0.15)] text-[#f9a8d4]",
  },
  {
    test: /health|fitness|gym|workout/i,
    className: "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]",
  },
  {
    test: /finance|money|budget|tax/i,
    className: "border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.15)] text-[#a7f3d0]",
  },
  {
    test: /learn|study|course|education/i,
    className: "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.15)] text-[#93c5fd]",
  },
  {
    test: /shop|grocery|store/i,
    className: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.15)] text-[#fcd34d]",
  },
  {
    test: /urgent|important|asap/i,
    className: "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] text-[#fca5a5]",
  },
];

/** Task cards, read-only chips */
export function labelChipDisplayClasses(name: string): string {
  const matched = rules.find((r) => r.test.test(name));
  const body = matched?.className ?? defaultChip;
  return `${chipBase} ${body}`;
}

const toggleIdle =
  "border-zinc-700/80 bg-transparent text-zinc-500 hover:border-zinc-600 hover:bg-white/[0.04] hover:text-zinc-300 light:border-zinc-300 light:text-zinc-600 light:hover:bg-zinc-100";

/** Filters & detail toggles */
export function labelChipToggleClasses(name: string, selected: boolean): string {
  const matched = rules.find((r) => r.test.test(name));
  const body = matched?.className ?? defaultChip;
  if (selected) {
    return `${chipBase} ${body} ring-1 ring-white/15 font-medium`;
  }
  return `${chipBase} ${toggleIdle}`;
}

/** Neutral fallback when name is unknown (legacy export) */
export const LABEL_CHIP_DISPLAY = defaultChip;

const priorityFilterOff =
  "border-zinc-700/80 text-zinc-500 hover:border-zinc-600 hover:bg-white/[0.04] hover:text-zinc-300 light:border-zinc-300 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-900";

export const PRIORITY_FILTER_STYLES: Record<
  TaskPriority,
  { on: string; off: string }
> = {
  URGENT: {
    on: "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.2)] text-[#fca5a5] font-semibold",
    off: priorityFilterOff,
  },
  HIGH: {
    on: "border-[rgba(251,146,60,0.35)] bg-[rgba(251,146,60,0.18)] text-[#fdba74] font-semibold",
    off: priorityFilterOff,
  },
  MEDIUM: {
    on: "border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.15)] text-[#fde047] font-semibold",
    off: priorityFilterOff,
  },
  LOW: {
    on: "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.15)] text-[#86efac] font-semibold",
    off: priorityFilterOff,
  },
  NONE: {
    on: "border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.1)] text-[#94a3b8] font-semibold",
    off: priorityFilterOff,
  },
};
