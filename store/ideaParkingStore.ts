"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { IdeaDto, IdeaStatusApi } from "@/lib/ideas/types";
import { useUiStore } from "@/store/uiStore";

export type IdeaSortMode = "votes" | "newest";
export type IdeaViewMode = "kanban" | "list";

type IdeaParkingState = {
  ideas: IdeaDto[];
  loading: boolean;
  error: string | null;
  sort: IdeaSortMode;
  viewMode: IdeaViewMode;
  /** Fetch ideas (optionally with server-side sort only). */
  loadIdeas: () => Promise<void>;
  /** Optimistic insert then reconcile with server response. */
  createIdea: (payload: { title: string; description?: string; tags: string[] }) => Promise<IdeaDto | null>;
  updateIdea: (id: string, patch: Record<string, unknown>) => Promise<IdeaDto | null>;
  voteIdea: (id: string, delta: 1 | -1) => Promise<void>;
  deleteIdea: (id: string) => Promise<boolean>;
  setSort: (s: IdeaSortMode) => void;
  setViewMode: (v: IdeaViewMode) => void;
};

function toastErr(title: string, body?: string) {
  useUiStore.getState().showToast({ title, body });
}

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const useIdeaParkingStore = create<IdeaParkingState>()(
  persist(
    (set, get) => ({
      ideas: [],
      loading: false,
      error: null,
      sort: "newest",
      viewMode: "kanban",

      setSort: (sort) => {
        set({ sort });
        void get().loadIdeas();
      },

      setViewMode: (viewMode) => set({ viewMode }),

      loadIdeas: async () => {
        set({ loading: true, error: null });
        const sort = get().sort;
        const qs = new URLSearchParams({ sort });
        try {
          const res = await fetch(`/api/ideas?${qs}`);
          if (!res.ok) {
            const err = await parseJson<{ error?: string }>(res);
            set({ error: err?.error ?? "Failed to load", loading: false });
            return;
          }
          const ideas = (await res.json()) as IdeaDto[];
          set({ ideas, loading: false, error: null });
        } catch {
          set({ error: "Network error", loading: false });
        }
      },

      createIdea: async ({ title, description, tags }) => {
        const optimisticId = `optimistic-${Date.now()}`;
        const now = new Date().toISOString();
        const optimistic: IdeaDto = {
          id: optimisticId,
          title: title.trim(),
          description: description?.trim() ?? "",
          tags,
          status: "parked",
          votes: 0,
          columnOrder: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ ideas: [optimistic, ...s.ideas] }));

        try {
          const res = await fetch("/api/ideas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description?.trim() ?? "",
              tags,
            }),
          });
          const data = await parseJson<IdeaDto | { error?: unknown }>(res);
          if (!res.ok || !data || "error" in data) {
            set((s) => ({ ideas: s.ideas.filter((i) => i.id !== optimisticId) }));
            toastErr("Could not save idea", "Check your connection and try again.");
            return null;
          }
          set((s) => ({
            ideas: s.ideas.map((i) => (i.id === optimisticId ? (data as IdeaDto) : i)),
          }));
          return data as IdeaDto;
        } catch {
          set((s) => ({ ideas: s.ideas.filter((i) => i.id !== optimisticId) }));
          toastErr("Could not save idea");
          return null;
        }
      },

      updateIdea: async (id, patch) => {
        const prev = get().ideas;
        const current = prev.find((i) => i.id === id);
        if (!current) return null;

        const merged = { ...current, ...patch } as IdeaDto;
        set({ ideas: prev.map((i) => (i.id === id ? merged : i)) });

        try {
          const res = await fetch(`/api/ideas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const data = await parseJson<IdeaDto | { error?: unknown }>(res);
          if (!res.ok || !data || "error" in data) {
            set({ ideas: prev });
            toastErr("Update failed");
            return null;
          }
          set((s) => ({
            ideas: s.ideas.map((i) => (i.id === id ? (data as IdeaDto) : i)),
          }));
          return data as IdeaDto;
        } catch {
          set({ ideas: prev });
          toastErr("Update failed");
          return null;
        }
      },

      voteIdea: async (id, delta) => {
        const prev = get().ideas;
        const cur = prev.find((i) => i.id === id);
        if (!cur || cur.id.startsWith("optimistic-")) return;

        const nextVotes = Math.max(0, cur.votes + delta);
        set({
          ideas: prev.map((i) => (i.id === id ? { ...i, votes: nextVotes } : i)),
        });

        try {
          const res = await fetch(`/api/ideas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voteDelta: delta }),
          });
          const data = await parseJson<IdeaDto | { error?: unknown }>(res);
          if (!res.ok || !data || "error" in data) {
            set({ ideas: prev });
            return;
          }
          set((s) => ({
            ideas: s.ideas.map((i) => (i.id === id ? (data as IdeaDto) : i)),
          }));
        } catch {
          set({ ideas: prev });
        }
      },

      deleteIdea: async (id) => {
        const prev = get().ideas;
        set({ ideas: prev.filter((i) => i.id !== id) });
        try {
          const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
          if (!res.ok) {
            set({ ideas: prev });
            toastErr("Delete failed");
            return false;
          }
          return true;
        } catch {
          set({ ideas: prev });
          toastErr("Delete failed");
          return false;
        }
      },

    }),
    {
      name: "nexus-idea-parking-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ viewMode: s.viewMode, sort: s.sort }),
    }
  )
);

/** Client-side filter + sort for list/Kanban (full list is in memory). */
export function filterIdeas(
  ideas: IdeaDto[],
  opts: {
    search: string;
    statusFilter: IdeaStatusApi[];
    tagFilter: string[];
    sort: IdeaSortMode;
  }
): IdeaDto[] {
  const q = opts.search.trim().toLowerCase();
  let list = [...ideas];

  if (q) {
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (opts.statusFilter.length) {
    const set = new Set(opts.statusFilter);
    list = list.filter((i) => set.has(i.status));
  }

  if (opts.tagFilter.length) {
    list = list.filter((i) => opts.tagFilter.some((t) => i.tags.includes(t)));
  }

  if (opts.sort === "votes") {
    list.sort((a, b) => b.votes - a.votes || +new Date(b.createdAt) - +new Date(a.createdAt));
  } else {
    list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  return list;
}
