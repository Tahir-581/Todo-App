"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { useCallback, useState } from "react";
import type { IdeaActivityDto } from "@/lib/ideas/types";

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  title_updated: "Title updated",
  description_updated: "Description updated",
  tags_updated: "Tags updated",
  status_changed: "Status",
  vote: "Vote",
};

export function IdeaActivityList({ ideaId }: { ideaId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<IdeaActivityDto[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (rows !== null || ideaId.startsWith("optimistic-")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/activities`);
      if (res.ok) {
        const data = (await res.json()) as IdeaActivityDto[];
        setRows(data);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ideaId, rows]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void load();
  }

  return (
    <div className="mt-2 border-t border-zinc-800/60 pt-2 light:border-zinc-200">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-md py-1 text-left text-xs text-zinc-500 transition hover:text-zinc-300 light:hover:text-zinc-700"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <History className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span>Activity</span>
      </button>
      {open && loading ? <p className="mt-2 pl-6 text-xs text-zinc-600">Loading history…</p> : null}
      {open && !loading && rows && rows.length === 0 ? (
        <p className="mt-2 pl-6 text-xs text-zinc-600">No activity yet.</p>
      ) : null}
      {open && !loading && rows && rows.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto pl-6 text-xs text-zinc-400 light:text-zinc-600">
          {rows.map((r) => (
            <li key={r.id} className="border-l border-zinc-700 pl-2 light:border-zinc-300">
              <span className="font-medium text-zinc-300 light:text-zinc-800">
                {ACTION_LABEL[r.action] ?? r.action}
              </span>
              {r.detail ? <span className="mt-0.5 block text-zinc-500">{r.detail}</span> : null}
              <time className="mt-0.5 block text-[10px] text-zinc-600" dateTime={r.createdAt}>
                {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
