"use client";

import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_THEME,
  PRIORITY_FILTER,
  labelChipToggleClasses,
} from "@/lib/constants";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function FilterPanel({
  labels,
  projects,
  hideProject,
}: {
  labels: { id: string; name: string; color: string }[];
  projects: { id: string; name: string; emoji: string }[];
  hideProject?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleMulti(key: "status" | "priority", val: string) {
    const cur = new Set((sp.get(key) || "").split(",").filter(Boolean));
    if (cur.has(val)) cur.delete(val);
    else cur.add(val);
    const s = Array.from(cur).join(",");
    setParam(key, s || null);
  }

  function toggleLabel(id: string) {
    const cur = sp.getAll("labelId");
    const next = new Set(cur);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const p = new URLSearchParams(sp.toString());
    p.delete("labelId");
    next.forEach((lid) => p.append("labelId", lid));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    const st = sp.get("status");
    if (st)
      st.split(",").forEach((s) => {
        if (s in STATUS_LABELS)
          out.push({
            key: `status-${s}`,
            label: STATUS_LABELS[s as TaskStatus],
            clear: () => {
              const rest = st
                .split(",")
                .filter((x) => x !== s)
                .join(",");
              setParam("status", rest || null);
            },
          });
      });
    const pr = sp.get("priority");
    if (pr)
      pr.split(",").forEach((p) => {
        if (p in PRIORITY_LABELS)
          out.push({
            key: `priority-${p}`,
            label: PRIORITY_LABELS[p as TaskPriority],
            clear: () => {
              const rest = pr
                .split(",")
                .filter((x) => x !== p)
                .join(",");
              setParam("priority", rest || null);
            },
          });
      });
    sp.getAll("labelId").forEach((id) => {
      const lb = labels.find((l) => l.id === id);
      if (lb)
        out.push({
          key: `label-${id}`,
          label: lb.name,
          clear: () => toggleLabel(id),
        });
    });
    const pid = sp.get("projectId");
    if (pid && pid !== "all") {
      const proj = projects.find((p) => p.id === pid);
      if (proj)
        out.push({
          key: `project-${pid}`,
          label: `${proj.emoji} ${proj.name}`,
          clear: () => setParam("projectId", null),
        });
    }
    if (sp.get("dateFrom"))
      out.push({
        key: "df",
        label: `From ${sp.get("dateFrom")}`,
        clear: () => setParam("dateFrom", null),
      });
    if (sp.get("dateTo"))
      out.push({
        key: "dt",
        label: `To ${sp.get("dateTo")}`,
        clear: () => setParam("dateTo", null),
      });
    return out;
  }, [labels, projects, sp, pathname, router]);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" type="button" className="text-xs" onClick={() => setOpen((o) => !o)}>
          <Filter className="h-3.5 w-3.5" />
          Filters
        </Button>
        {chips.map((c) => (
          <Badge
            key={c.key}
            className="cursor-pointer gap-1 border border-zinc-700 bg-zinc-800/50 pr-1 text-zinc-300"
            onClick={c.clear}
          >
            {c.label}
            <X className="h-3 w-3" />
          </Badge>
        ))}
      </div>
      {open ? (
        <div className="grid gap-4 rounded-xl border border-zinc-800/80 bg-surface/50 p-4 md:grid-cols-2 light:border-zinc-200 light:bg-white">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => {
                const on = (sp.get("status") || "").split(",").includes(s);
                const th = STATUS_THEME[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleMulti("status", s)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      on ? th.filterOn : th.filterOff
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Priority</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => {
                const on = (sp.get("priority") || "").split(",").includes(p);
                const pf = PRIORITY_FILTER[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleMulti("priority", p)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${on ? pf.on : pf.off}`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Labels</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {labels.map((l) => {
                const on = sp.getAll("labelId").includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
                    className={`transition-colors ${labelChipToggleClasses(l.name, on)}`}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
          {!hideProject ? (
            <div>
              <p className="text-xs font-medium uppercase text-zinc-500">Project</p>
              <select
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                value={sp.get("projectId") || "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setParam("projectId", v === "all" ? null : v);
                }}
              >
                <option value="all">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="md:col-span-2 flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-zinc-500">Due from</p>
              <input
                type="date"
                className="mt-1 rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                value={sp.get("dateFrom")?.slice(0, 10) ?? ""}
                onChange={(e) => setParam("dateFrom", e.target.value ? `${e.target.value}T00:00:00.000Z` : null)}
              />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Due to</p>
              <input
                type="date"
                className="mt-1 rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                value={sp.get("dateTo")?.slice(0, 10) ?? ""}
                onChange={(e) => setParam("dateTo", e.target.value ? `${e.target.value}T23:59:59.999Z` : null)}
              />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Sort</p>
              <select
                className="mt-1 rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                value={sp.get("sort") || "createdAt"}
                onChange={(e) => setParam("sort", e.target.value)}
              >
                <option value="createdAt">Created</option>
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
