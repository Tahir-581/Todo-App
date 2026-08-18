"use client";

import type { TaskPriority, TaskRecurrence, TaskStatus } from "@prisma/client";
import { create } from "zustand";

export type TaskListTask = {
  id: string;
  taskRef: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  deadlineRecurrence: TaskRecurrence;
  reminderAt: string | null;
  reminderRecurrence: TaskRecurrence;
  reminderSound: boolean;
  reminderSnoozedUntil: string | null;
  projectId: string;
  completedAt: string | null;
  project: { id: string; name: string; color: string; emoji: string };
  labels: { label: { id: string; name: string; color: string } }[];
  subtasks: { id: string; title: string; completed: boolean; order: number }[];
  _count: { subtasks: number; comments: number };
};

type TaskState = {
  tasks: TaskListTask[];
  loading: boolean;
  lastQuery: string;
  selectedTaskId: string | null;
  setTasks: (tasks: TaskListTask[]) => void;
  setLoading: (v: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  patchTask: (id: string, patch: Partial<TaskListTask>) => void;
  removeTask: (id: string) => void;
  addTask: (task: TaskListTask) => void;
  fetchTasks: (query: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: true,
  lastQuery: "",
  selectedTaskId: null,
  setTasks: (tasks) => set({ tasks }),
  setLoading: (loading) => set({ loading }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  patchTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  fetchTasks: async (query) => {
    set({ loading: true, lastQuery: query });
    try {
      const res = await fetch(`/api/tasks?${query}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as TaskListTask[];
      set({ tasks: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  refreshTasks: async () => {
    const q = get().lastQuery;
    await get().fetchTasks(q);
  },
}));
