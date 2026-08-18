"use client";

import { motion } from "framer-motion";
import {
  addDays,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TaskListTask } from "@/store/taskStore";
import { useTaskStore } from "@/store/taskStore";
import { ListTodo } from "lucide-react";
import { DASHBOARD_SECTION_THEME, isCompletedTaskStatus } from "@/lib/constants";

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskListTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState("");
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date());
  const { todayTasks, overdue, upcoming, chartData, weekDone } = useMemo(() => {
    const todayTasks = tasks.filter(
      (t) =>
        t.deadline &&
        isSameDay(new Date(t.deadline), today) &&
        !isCompletedTaskStatus(t.status) &&
        t.status !== "CANCELLED"
    );
    const overdue = tasks.filter(
      (t) =>
        t.deadline &&
        new Date(t.deadline) < today &&
        !isCompletedTaskStatus(t.status) &&
        t.status !== "CANCELLED"
    );
    const weekEnd = addDays(today, 7);
    const upcoming = tasks.filter(
      (t) =>
        t.deadline &&
        new Date(t.deadline) > today &&
        new Date(t.deadline) <= weekEnd &&
        !isCompletedTaskStatus(t.status) &&
        t.status !== "CANCELLED"
    );
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekRange = { start: weekStart, end: endOfWeek(today, { weekStartsOn: 1 }) };
    const weekDone = tasks.filter(
      (t) =>
        isCompletedTaskStatus(t.status) &&
        t.completedAt &&
        isWithinInterval(new Date(t.completedAt), weekRange)
    ).length;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const chartData = days.map((day, i) => {
      const d0 = addDays(weekStart, i);
      const count = tasks.filter(
        (t) =>
          isCompletedTaskStatus(t.status) &&
          t.completedAt &&
          isSameDay(new Date(t.completedAt), d0)
      ).length;
      return { day, count };
    });

    return { todayTasks, overdue, upcoming, chartData, weekDone };
  }, [tasks, today]);

  async function quickAdd() {
    const title = quick.trim();
    if (!title) return;
    const projects = await fetch("/api/projects").then((r) => r.json());
    const pid = projects[0]?.id;
    if (!pid) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId: pid }),
    });
    if (res.ok) {
      const t = await res.json();
      setTasks((prev) => [t, ...prev]);
      setQuick("");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-zinc-500">Your day at a glance.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-surface/50 p-4 shadow-none transition-shadow focus-within:border-transparent focus-within:shadow-[0_0_0_2px_var(--cta-focus-ring)] md:flex-row md:items-end light:border-zinc-200 light:bg-white">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Quick add</label>
          <Input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="✦ Capture a task…"
            className="mt-2 focus-visible:border-zinc-800 focus-visible:ring-0 light:focus-visible:border-zinc-300"
            onKeyDown={(e) => e.key === "Enter" && quickAdd()}
          />
        </div>
        <Button
          onClick={quickAdd}
          className="border-0 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white shadow-lg hover:from-[#6d28d9] hover:to-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cta-focus-ring)]"
        >
          Add task
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-800/40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Section variant="today" title="Today" tasks={todayTasks} onOpen={(id) => setSelectedTaskId(id)} />
            <Section variant="overdue" title="Overdue" tasks={overdue} onOpen={(id) => setSelectedTaskId(id)} />
            <Section
              variant="upcoming"
              title="Upcoming (7 days)"
              tasks={upcoming}
              onOpen={(id) => setSelectedTaskId(id)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-surface/50 p-4 light:border-zinc-200 light:bg-white">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-zinc-200 light:text-zinc-900">Completed this week</h2>
                <span className="font-mono text-2xl font-semibold text-accent">{weekDone}</span>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="completedWeekGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#27272a"
                      strokeDasharray="4 4"
                      vertical={false}
                      opacity={0.45}
                    />
                    <XAxis dataKey="day" stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#161618", border: "1px solid #27272a", borderRadius: 8 }}
                    />
                    <Bar
                      dataKey="count"
                      fill="url(#completedWeekGrad)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-zinc-800/80 p-6 text-sm text-zinc-500 light:border-zinc-300">
              <ListTodo className="mb-2 h-8 w-8 text-zinc-600" />
              <p>
                Tip: press{" "}
                <kbd className="rounded border border-zinc-700 bg-black/30 px-1.5 py-0.5 font-mono text-xs">
                  ⌘K
                </kbd>{" "}
                to open the command palette and jump anywhere.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/tasks")}>
                Open tasks
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function Section({
  variant,
  title,
  tasks,
  onOpen,
}: {
  variant: keyof typeof DASHBOARD_SECTION_THEME;
  title: string;
  tasks: TaskListTask[];
  onOpen: (id: string) => void;
}) {
  const th = DASHBOARD_SECTION_THEME[variant];
  return (
    <div className={th.shell}>
      <h2 className={`flex items-center gap-2 ${th.title}`}>
        <span aria-hidden className="text-base leading-none">
          {th.titleIcon}
        </span>
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <li className="text-sm text-zinc-600 light:text-zinc-500">Nothing here.</li>
        ) : (
          tasks.slice(0, 8).map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t.id)} className={th.item}>
                {t.title}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
