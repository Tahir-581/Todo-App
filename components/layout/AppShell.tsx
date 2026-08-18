"use client";

import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useDeadlineEmailCheck } from "@/hooks/useDeadlineEmailCheck";
import { useReminderChecker } from "@/hooks/useReminderChecker";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { ToastHost } from "@/components/ui/Toast";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore } from "@/store/uiStore";
import { Suspense, useEffect, type ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  useCommandPalette();
  useReminderChecker();
  useDeadlineEmailCheck();
  const toast = useUiStore((s) => s.toast);
  const dismissToast = useUiStore((s) => s.dismissToast);
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);
  const refreshTasks = useTaskStore((s) => s.refreshTasks);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { theme?: string } | null) => {
        if (!u) return;
        document.documentElement.classList.toggle("light", u.theme === "light");
        document.documentElement.classList.toggle("dark", u.theme !== "light");
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0D0D0F] light:bg-zinc-100">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <Suspense fallback={<div className="h-14 border-b border-zinc-800/80" />}>
          <Header user={user} />
        </Suspense>
        <main className="flex-1 overflow-auto px-4 py-6 md:px-8">{children}</main>
      </div>
      <CommandPalette />
      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => {
          void refreshTasks();
        }}
      />
      <ToastHost toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
