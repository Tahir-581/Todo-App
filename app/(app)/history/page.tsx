"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { taskDisplayId } from "@/lib/constants";
import { useTaskStore } from "@/store/taskStore";
import Link from "next/link";

type Row = {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  task: { id: string; title: string; taskRef: number } | null;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Activity history</h1>
      <p className="mt-1 text-sm text-zinc-500">Recent changes across all tasks.</p>
      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800/80 light:border-zinc-200">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-800/40" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/80 light:divide-zinc-200">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-medium text-zinc-200 light:text-zinc-900">{r.action}</span>
                  {r.task ? (
                    <Link
                      href="/tasks"
                      className="ml-2 text-xs text-accent hover:underline"
                      onClick={() => useTaskStore.getState().setSelectedTaskId(r.task!.id)}
                    >
                      {r.task.title} ({taskDisplayId(r.task.taskRef)})
                    </Link>
                  ) : null}
                  {r.oldValue || r.newValue ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {r.oldValue ?? "—"} → {r.newValue ?? "—"}
                    </p>
                  ) : null}
                </div>
                <span className="font-mono text-xs text-zinc-600">
                  {format(new Date(r.createdAt), "PPpp")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
