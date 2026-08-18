"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useTaskStore, type TaskListTask } from "@/store/taskStore";
import { useUiStore, type ViewMode } from "@/store/uiStore";
import type { TaskStatus } from "@prisma/client";
import { FilterPanel } from "./FilterPanel";
import { TaskListView } from "./TaskListView";
import { KanbanBoard } from "./KanbanBoard";
import { CalendarView } from "./CalendarView";
import { ListTodo } from "lucide-react";
import type { CreateTaskPayload } from "./AddTaskModal";

type Project = { id: string; name: string; emoji: string; color: string };
type Label = { id: string; name: string; color: string };

export function TasksWorkspace({
  projectId,
  hideProjectFilter,
}: {
  projectId?: string;
  hideProjectFilter?: boolean;
}) {
  const { buildTasksApiQuery, sp } = useTaskFilters();
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const patchTask = useTaskStore((s) => s.patchTask);
  const addTask = useTaskStore((s) => s.addTask);
  const loading = useTaskStore((s) => s.loading);

  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]));
    fetch("/api/labels")
      .then((r) => r.json())
      .then(setLabels)
      .catch(() => setLabels([]));
  }, []);

  useEffect(() => {
    const v = sp.get("view") as ViewMode | null;
    if (v === "list" || v === "kanban" || v === "calendar") setViewMode(v);
  }, [sp, setViewMode]);

  const query = useMemo(() => {
    const p = new URLSearchParams(buildTasksApiQuery);
    if (projectId) p.set("projectId", projectId);
    return p.toString();
  }, [buildTasksApiQuery, projectId]);

  const refresh = useCallback(() => {
    return fetchTasks(query);
  }, [fetchTasks, query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const defaultProjectId = projectId ?? projects[0]?.id ?? "";

  async function onQuickAdd(status: TaskStatus, title: string) {
    if (!defaultProjectId) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId: defaultProjectId, status }),
    });
    if (res.ok) {
      const t = (await res.json()) as TaskListTask;
      addTask(t);
    }
  }

  async function onCreateTaskFromBoard(status: TaskStatus, payload: CreateTaskPayload) {
    if (!defaultProjectId) {
      throw new Error("No project");
    }
    const body: Record<string, unknown> = {
      title: payload.title,
      description: payload.description || undefined,
      projectId: defaultProjectId,
      status,
      priority: payload.priority,
      deadlineRecurrence: payload.deadlineRecurrence,
      reminderRecurrence: payload.reminderRecurrence,
    };
    if (payload.deadline) {
      body.deadline = payload.deadline;
    }
    if (payload.reminderAt) {
      body.reminderAt = payload.reminderAt;
    }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error("Create failed");
    }
    const t = (await res.json()) as TaskListTask;
    addTask(t);
  }

  async function onTitleSave(id: string, title: string) {
    patchTask(id, { title });
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function onStatusChange(taskId: string, status: TaskStatus) {
    const prev = tasks.find((t) => t.id === taskId);
    patchTask(taskId, { status });
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok && prev) patchTask(taskId, { status: prev.status });
    else if (res.ok) {
      const t = (await res.json()) as TaskListTask;
      patchTask(taskId, {
        status: t.status,
        deadline: t.deadline,
        deadlineRecurrence: t.deadlineRecurrence ?? "NONE",
        reminderAt: t.reminderAt,
        reminderRecurrence: t.reminderRecurrence ?? "NONE",
        completedAt: t.completedAt,
      });
    }
  }

  async function onDeadlineChange(taskId: string, date: Date) {
    const iso = date.toISOString();
    patchTask(taskId, { deadline: iso });
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline: iso }),
    });
  }

  return (
    <div>
      <FilterPanel labels={labels} projects={projects} hideProject={hideProjectFilter} />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800/40" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-24 text-center light:border-zinc-300"
        >
          <ListTodo className="h-12 w-12 text-zinc-600" />
          <p className="mt-4 font-medium text-zinc-300">No tasks yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Create a project from the sidebar, then add tasks from the board or list view.
          </p>
        </motion.div>
      ) : viewMode === "list" ? (
        <TaskListView
          tasks={tasks}
          onOpenTask={(id) => setSelectedTaskId(id)}
          onTitleSave={onTitleSave}
          onQuickAdd={onQuickAdd}
        />
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          onOpenTask={(id) => setSelectedTaskId(id)}
          onStatusChange={onStatusChange}
          onCreateTask={onCreateTaskFromBoard}
        />
      ) : (
        <CalendarView
          tasks={tasks}
          onOpenTask={(id) => setSelectedTaskId(id)}
          onDeadlineChange={onDeadlineChange}
        />
      )}
    </div>
  );
}
