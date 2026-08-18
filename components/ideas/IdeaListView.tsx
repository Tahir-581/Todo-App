"use client";

import type { IdeaDto } from "@/lib/ideas/types";
import { IdeaCard } from "./IdeaCard";

export function IdeaListView({
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
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} variant="list" onVote={onVote} onPatch={onPatch} onDelete={onDelete} />
      ))}
    </div>
  );
}
