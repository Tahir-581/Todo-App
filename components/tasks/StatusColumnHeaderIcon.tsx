"use client";

import { Loader2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { STATUS_HEADER_GLYPH, STATUS_THEME } from "@/lib/constants";

export function StatusColumnHeaderIcon({ status }: { status: TaskStatus }) {
  const th = STATUS_THEME[status];
  if (status === "IN_PROGRESS") {
    return <Loader2 className={`h-3.5 w-3.5 shrink-0 animate-spin ${th.columnIconClass}`} aria-hidden />;
  }
  return (
    <span
      className={`shrink-0 select-none text-base leading-none ${th.columnIconClass}`}
      aria-hidden
    >
      {STATUS_HEADER_GLYPH[status]}
    </span>
  );
}
