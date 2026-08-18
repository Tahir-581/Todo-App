"use client";

import { Sparkles } from "lucide-react";
import type { IdeaDto, IdeaStatusApi } from "@/lib/ideas/types";
import { IdeaCard } from "./IdeaCard";

const PROMOTED: IdeaStatusApi[] = ["parked", "priority", "in-progress"];

/** Highlights the highest-voted ideas that are not done or shelved. */
export function IdeaTopSection({
  ideas,
  onVote,
  onPatch,
  onDelete,
}: {
  ideas: IdeaDto[];
  onVote: (id: string, d: 1 | -1) => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const top = [...ideas]
    .filter((i) => PROMOTED.includes(i.status))
    .sort((a, b) => b.votes - a.votes || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  if (top.length === 0 || top.every((i) => i.votes === 0)) {
    return null;
  }

  return (
    <section className="mb-8 rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 via-surface to-violet-950/30 p-5 shadow-inner light:border-indigo-200 light:from-indigo-50 light:to-violet-50 light:bg-white">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-300 light:text-amber-600" aria-hidden />
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100 light:text-zinc-900">
          Top ideas
        </h2>
        <span className="text-xs text-zinc-500">By votes · still in flight</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {top.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} variant="kanban" onVote={onVote} onPatch={onPatch} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
