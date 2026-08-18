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
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState, type ReactNode } from "react";
import type { TaskListTask } from "@/store/taskStore";
import { PRIORITY_DOT, PRIORITY_CALENDAR_CHIP } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function DroppableDay({
  day,
  currentMonth,
  children,
}: {
  day: Date;
  currentMonth: Date;
  children: ReactNode;
}) {
  const id = `day-${dayKey(day)}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  const muted = !isSameMonth(day, currentMonth);
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] border border-zinc-800/60 p-1 text-xs transition-colors light:border-zinc-200 ${
        muted ? "opacity-40" : ""
      } ${isToday(day) ? "bg-accent/5 ring-1 ring-accent/30" : ""} ${
        isOver ? "bg-accent/10" : ""
      }`}
    >
      <div className="mb-1 font-mono text-[10px] text-zinc-500">{format(day, "d")}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function DraggableChip({ task, onOpen }: { task: TaskListTask; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen()}
      className={`truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] transition-shadow ${PRIORITY_CALENDAR_CHIP[task.priority]} ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
      {task.title}
    </button>
  );
}

export function CalendarView({
  tasks,
  onOpenTask,
  onDeadlineChange,
}: {
  tasks: TaskListTask[];
  onOpenTask: (id: string) => void;
  onDeadlineChange: (taskId: string, date: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const m: Record<string, TaskListTask[]> = {};
    for (const t of tasks) {
      if (!t.deadline) continue;
      if (t.status === "DONE" || t.status === "TODAY_DONE" || t.status === "CANCELLED") continue;
      const k = dayKey(new Date(t.deadline));
      if (!m[k]) m[k] = [];
      m[k].push(t);
    }
    return m;
  }, [tasks]);

  function handleDragEnd(e: DragEndEvent) {
    const taskId = String(e.active.id);
    const overId = e.over?.id as string | undefined;
    if (!overId?.startsWith("day-")) return;
    const iso = overId.replace("day-", "");
    const [y, mo, d] = iso.split("-").map(Number);
    const task = tasks.find((t) => t.id === taskId);
    const prev = task?.deadline ? new Date(task.deadline) : new Date();
    const next = new Date(y, mo - 1, d, prev.getHours(), prev.getMinutes(), 0, 0);
    onDeadlineChange(taskId, next);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="rounded-xl border border-zinc-800/80 bg-surface/40 p-4 light:border-zinc-200 light:bg-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {format(cursor, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              type="button"
              className="px-2"
              onClick={() => setCursor((c) => addMonths(c, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="px-2"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-800/40 p-px light:bg-zinc-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div key={w} className="bg-[#0D0D0F] py-2 text-center text-[10px] font-medium text-zinc-500 light:bg-zinc-50">
              {w}
            </div>
          ))}
          {days.map((day) => (
            <DroppableDay key={day.toISOString()} day={day} currentMonth={cursor}>
              {(byDay[dayKey(day)] ?? []).map((t) => (
                <DraggableChip key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
              ))}
            </DroppableDay>
          ))}
        </div>
      </div>
    </DndContext>
  );
}
