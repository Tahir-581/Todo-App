"use client";

import { Lightbulb } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterIdeas, useIdeaParkingStore } from "@/store/ideaParkingStore";
import type { IdeaStatusApi } from "@/lib/ideas/types";
import { IdeaCaptureForm, type IdeaCaptureFormRef } from "./IdeaCaptureForm";
import { IdeaFiltersBar } from "./IdeaFiltersBar";
import { IdeaKanbanBoard } from "./IdeaKanbanBoard";
import { IdeaListView } from "./IdeaListView";
import { IdeaTopSection } from "./IdeaTopSection";

/**
 * Idea Parking Lot — full client surface: capture form, filters, Kanban/list,
 * votes, status changes (dropdown + drag), and activity log per card.
 */
export function IdeaParkingLot() {
  const formRef = useRef<IdeaCaptureFormRef>(null);
  const ideas = useIdeaParkingStore((s) => s.ideas);
  const loading = useIdeaParkingStore((s) => s.loading);
  const loadIdeas = useIdeaParkingStore((s) => s.loadIdeas);
  const createIdea = useIdeaParkingStore((s) => s.createIdea);
  const updateIdea = useIdeaParkingStore((s) => s.updateIdea);
  const voteIdea = useIdeaParkingStore((s) => s.voteIdea);
  const deleteIdea = useIdeaParkingStore((s) => s.deleteIdea);
  const sort = useIdeaParkingStore((s) => s.sort);
  const setSort = useIdeaParkingStore((s) => s.setSort);
  const viewMode = useIdeaParkingStore((s) => s.viewMode);
  const setViewMode = useIdeaParkingStore((s) => s.setViewMode);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IdeaStatusApi[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  /** Focus capture field: `N` when not typing in an input. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      const editable = t.isContentEditable;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        formRef.current?.focusTitle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of ideas) {
      for (const t of i.tags) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [ideas]);

  const filtered = useMemo(
    () => filterIdeas(ideas, { search, statusFilter, tagFilter, sort }),
    [ideas, search, statusFilter, tagFilter, sort]
  );

  const onPatch = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      await updateIdea(id, patch);
    },
    [updateIdea]
  );

  const onCreate = useCallback(
    async (payload: { title: string; description?: string; tags: string[] }) => {
      await createIdea(payload);
    },
    [createIdea]
  );

  function toggleStatus(s: IdeaStatusApi) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleTag(t: string) {
    setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-2xl shadow-inner">
            <Lightbulb className="h-6 w-6 text-accent" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white light:text-zinc-900 md:text-3xl">
              Idea Parking Lot
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400 light:text-zinc-600">
              Capture thoughts before they slip away. Tag, vote, and move ideas into execution when the time is right.
            </p>
          </div>
        </div>
      </header>

      <IdeaCaptureForm ref={formRef} onCreate={onCreate} existingTags={allTags} />

      <IdeaFiltersBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onToggleStatus={toggleStatus}
        tagFilter={tagFilter}
        allTags={allTags}
        onToggleTag={toggleTag}
        sort={sort}
        onSortChange={setSort}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearStatuses={() => setStatusFilter([])}
        onClearTags={() => setTagFilter([])}
      />

      {loading && ideas.length === 0 ? (
        <div className="flex justify-center py-20 text-sm text-zinc-500">Loading ideas…</div>
      ) : ideas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 px-8 py-16 text-center light:border-zinc-300 light:bg-zinc-50">
          <p className="text-lg font-medium text-zinc-200 light:text-zinc-800">Your lot is empty</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Drop the first idea in the field above — titles only are fine. You can add tags and descriptions anytime.
          </p>
        </div>
      ) : (
        <>
          <IdeaTopSection ideas={ideas} onVote={voteIdea} onPatch={onPatch} onDelete={deleteIdea} />

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-surface/40 py-12 text-center text-sm text-zinc-500 light:border-zinc-200">
              No ideas match your filters. Try clearing search or status chips.
            </div>
          ) : viewMode === "kanban" ? (
            <IdeaKanbanBoard
              ideas={filtered}
              onVote={voteIdea}
              onPatch={onPatch}
              onDelete={deleteIdea}
              onStatusChange={(id, status) => void updateIdea(id, { status })}
            />
          ) : (
            <IdeaListView ideas={filtered} onVote={voteIdea} onPatch={onPatch} onDelete={deleteIdea} />
          )}
        </>
      )}
    </div>
  );
}
