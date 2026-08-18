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
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { STATUS_LABELS, STATUS_ORDER, STATUS_THEME } from "@/lib/constants";
import type { TaskListTask } from "@/store/taskStore";
import type { TaskStatus } from "@prisma/client";
import { AddTaskModal, type CreateTaskPayload } from "./AddTaskModal";
import { StatusColumnHeaderIcon } from "./StatusColumnHeaderIcon";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";

function WipInput({ status, value }: { status: TaskStatus; value?: number }) {
  const setWipLimit = useUiStore((s) => s.setWipLimit);
  return (
    <label className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-500">
      <span className="hidden sm:inline">Limit</span>
      <input
        type="number"
        min={0}
        placeholder="—"
        className="w-11 rounded border border-zinc-700 bg-[#0D0D0F] px-1 py-0.5 text-xs text-zinc-200 light:bg-white light:text-zinc-900"
        value={value && value > 0 ? value : ""}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          setWipLimit(status, Number.isFinite(n) && n > 0 ? n : undefined);
        }}
      />
    </label>
  );
}

function Column({
  status,
  children,
  count,
  wip,
  onAdd,
}: {
  status: TaskStatus;
  children: ReactNode;
  count: number;
  wip?: number;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const overWip = wip != null && wip > 0 && count > wip;
  const th = STATUS_THEME[status];

  return (
    <div className={`flex w-72 shrink-0 flex-col overflow-hidden ${th.column}`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${th.columnHeader}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusColumnHeaderIcon status={status} />
            <p className={`text-sm font-medium ${th.columnTitle}`}>{STATUS_LABELS[status]}</p>
          </div>
          <p className={`mt-0.5 pl-[1.625rem] text-xs ${th.columnMeta}`}>
            {count}
            {wip != null && wip > 0 ? ` / WIP ${wip}` : ""}
            {overWip ? (
              <span className="ml-1 font-medium text-amber-400 light:text-amber-600"> · over limit</span>
            ) : null}
          </p>
        </div>
        <WipInput status={status} value={wip} />
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? th.droppable : ""
        }`}
      >
        {children}
        <Button
          variant="ghost"
          className={`mt-1 w-full text-xs text-zinc-500 light:text-zinc-600 ${th.addTaskHover}`}
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </Button>
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  onOpen,
}: {
  task: TaskListTask;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onOpen={onOpen} isDragging={isDragging} />
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onOpenTask,
  onStatusChange,
  onCreateTask,
}: {
  tasks: TaskListTask[];
  onOpenTask: (id: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCreateTask: (
    status: TaskStatus,
    payload: CreateTaskPayload
  ) => Promise<void>;
}) {
  const [addForColumn, setAddForColumn] = useState<TaskStatus | null>(null);
  const wipLimits = useUiStore((s) => s.wipLimits);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function resolveStatus(overId: string | undefined | null): TaskStatus | null {
    if (!overId) return null;
    if (STATUS_ORDER.includes(overId as TaskStatus)) return overId as TaskStatus;
    const t = tasks.find((x) => x.id === overId);
    return t?.status ?? null;
  }

  function handleDragEnd(e: DragEndEvent) {
    const taskId = String(e.active.id);
    const next = resolveStatus(e.over?.id as string);
    if (!next) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === next) return;
    onStatusChange(taskId, next);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => {
          const col = tasks.filter((t) => t.status === status);
          const wip = wipLimits[status];
          return (
            <Column
              key={status}
              status={status}
              count={col.length}
              wip={wip}
              onAdd={() => setAddForColumn(status)}
            >
              {col.map((task) => (
                <DraggableCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
              ))}
            </Column>
          );
        })}
      </div>
      <AddTaskModal
        open={addForColumn !== null}
        status={addForColumn ?? "TODO"}
        onClose={() => setAddForColumn(null)}
        onCreate={async (payload) => {
          if (addForColumn === null) return;
          await onCreateTask(addForColumn, payload);
        }}
      />
    </DndContext>
  );
}
