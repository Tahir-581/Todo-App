"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IDEA_STATUS_EMOJI, IDEA_STATUS_LABEL, IDEA_STATUS_ORDER } from "@/lib/ideas/ideaStatusMeta";
import type { IdeaStatusApi } from "@/lib/ideas/types";
import type { IdeaSortMode, IdeaViewMode } from "@/store/ideaParkingStore";

export function IdeaFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onToggleStatus,
  tagFilter,
  allTags,
  onToggleTag,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  onClearStatuses,
  onClearTags,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: IdeaStatusApi[];
  onToggleStatus: (s: IdeaStatusApi) => void;
  tagFilter: string[];
  allTags: string[];
  onToggleTag: (t: string) => void;
  sort: IdeaSortMode;
  onSortChange: (s: IdeaSortMode) => void;
  viewMode: IdeaViewMode;
  onViewModeChange: (v: IdeaViewMode) => void;
  onClearStatuses: () => void;
  onClearTags: () => void;
}) {
  return (
    <div className="mb-6 space-y-4 rounded-xl border border-zinc-800/60 bg-black/20 p-4 light:border-zinc-200 light:bg-zinc-50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ideas…"
            className="pl-9"
            aria-label="Search ideas"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as IdeaSortMode)}
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-accent light:border-zinc-300 light:bg-white light:text-zinc-900"
          >
            <option value="newest">Newest</option>
            <option value="votes">Most voted</option>
          </select>
          <div className="mx-1 hidden h-6 w-px bg-zinc-700 sm:block light:bg-zinc-300" />
          <span className="text-xs text-zinc-500">View</span>
          <div className="flex rounded-lg border border-zinc-700 p-0.5 light:border-zinc-300">
            <Button
              type="button"
              variant={viewMode === "kanban" ? "primary" : "ghost"}
              className="!px-2 !py-1"
              onClick={() => onViewModeChange("kanban")}
              aria-pressed={viewMode === "kanban"}
              title="Kanban board"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "primary" : "ghost"}
              className="!px-2 !py-1"
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
              title="List"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</p>
        <div className="flex flex-wrap gap-2">
          {IDEA_STATUS_ORDER.map((s) => {
            const on = statusFilter.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => onToggleStatus(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on
                    ? "border-accent bg-accent/20 text-indigo-100 light:text-indigo-900"
                    : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500 light:border-zinc-300 light:bg-white light:text-zinc-700"
                }`}
              >
                {IDEA_STATUS_EMOJI[s]} {IDEA_STATUS_LABEL[s]}
              </button>
            );
          })}
          {statusFilter.length ? (
            <button
              type="button"
              className="text-xs text-zinc-500 underline-offset-2 hover:underline"
              onClick={onClearStatuses}
            >
              Clear status
            </button>
          ) : null}
        </div>
      </div>

      {allTags.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Tags</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const on = tagFilter.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onToggleTag(t)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                    on
                      ? "border-teal-500/60 bg-teal-950/40 text-teal-100 light:bg-teal-100 light:text-teal-900"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 light:border-zinc-300 light:text-zinc-700"
                  }`}
                >
                  {t}
                </button>
              );
            })}
            {tagFilter.length ? (
              <button
                type="button"
                className="text-xs text-zinc-500 underline-offset-2 hover:underline"
                onClick={onClearTags}
              >
                Clear tags
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
