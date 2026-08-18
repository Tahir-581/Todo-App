"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
import { IDEA_STATUS_COLUMN_THEME, IDEA_STATUS_EMOJI, IDEA_STATUS_LABEL, IDEA_STATUS_ORDER } from "@/lib/ideas/ideaStatusMeta";
import type { IdeaDto, IdeaStatusApi } from "@/lib/ideas/types";
import { IdeaCard } from "./IdeaCard";

function Column({
  status,
  children,
  count,
}: {
  status: IdeaStatusApi;
  children: ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const th = IDEA_STATUS_COLUMN_THEME[status];

  return (
    <div className={`flex w-[min(100%,20rem)] shrink-0 flex-col overflow-hidden ${th.column}`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${th.header}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden>
              {IDEA_STATUS_EMOJI[status]}
            </span>
            <p className={`truncate text-sm font-medium ${th.title}`}>{IDEA_STATUS_LABEL[status]}</p>
          </div>
          <p className={`mt-0.5 pl-8 text-xs ${th.meta}`}>{count} ideas</p>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[180px] flex-1 flex-col gap-2 p-2 transition-colors ${isOver ? th.droppable : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function DraggableIdeaCard({
  idea,
  onVote,
  onPatch,
  onDelete,
}: {
  idea: IdeaDto;
  onVote: (id: string, d: 1 | -1) => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idea.id,
    data: { idea },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-50 opacity-90" : ""}
      {...listeners}
      {...attributes}
    >
      <IdeaCard idea={idea} variant="kanban" onVote={onVote} onPatch={onPatch} onDelete={onDelete} />
    </div>
  );
}

export function IdeaKanbanBoard({
  ideas,
  onVote,
  onPatch,
  onDelete,
  onStatusChange,
}: {
  ideas: IdeaDto[];
  onVote: (id: string, d: 1 | -1) => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
  onStatusChange: (ideaId: string, status: IdeaStatusApi) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  function resolveStatus(overId: string | undefined | null): IdeaStatusApi | null {
    if (!overId) return null;
    if (IDEA_STATUS_ORDER.includes(overId as IdeaStatusApi)) return overId as IdeaStatusApi;
    const hit = ideas.find((i) => i.id === overId);
    return hit?.status ?? null;
  }

  function handleDragEnd(e: DragEndEvent) {
    const ideaId = String(e.active.id);
    const next = resolveStatus(e.over?.id as string);
    if (!next) return;
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea || idea.status === next) return;
    onStatusChange(ideaId, next);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {IDEA_STATUS_ORDER.map((status) => {
          const col = ideas
            .filter((i) => i.status === status)
            .sort((a, b) => a.columnOrder - b.columnOrder || +new Date(b.createdAt) - +new Date(a.createdAt));
          return (
            <Column key={status} status={status} count={col.length}>
              {col.map((idea) => (
                <DraggableIdeaCard
                  key={idea.id}
                  idea={idea}
                  onVote={onVote}
                  onPatch={onPatch}
                  onDelete={onDelete}
                />
              ))}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}
