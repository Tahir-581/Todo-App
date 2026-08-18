"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ToastData } from "@/components/ui/Toast";

export type ViewMode = "list" | "kanban" | "calendar";

type WipLimits = Partial<Record<string, number>>;

type UiState = {
  /** When true, desktop sidebar shows icon-only rail. */
  sidebarCollapsed: boolean;
  mobileNav: boolean;
  commandOpen: boolean;
  viewMode: ViewMode;
  wipLimits: WipLimits;
  toast: ToastData | null;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setMobileNav: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setWipLimit: (status: string, n: number | undefined) => void;
  showToast: (t: Omit<ToastData, "id"> & { id?: string }) => void;
  /** Use `'snooze'` when only pausing audio; default runs `onFullDismiss` like Dismiss / ✕. */
  dismissToast: (reason?: "default" | "snooze") => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNav: false,
      commandOpen: false,
      viewMode: "list",
      wipLimits: {},
      toast: null,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNav: (mobileNav) => set({ mobileNav }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setViewMode: (viewMode) => set({ viewMode }),
      setWipLimit: (status, n) =>
        set((s) => {
          const wipLimits = { ...s.wipLimits };
          if (n === undefined) delete wipLimits[status];
          else wipLimits[status] = n;
          return { wipLimits };
        }),
      showToast: (t) =>
        set({
          toast: {
            id: t.id ?? crypto.randomUUID(),
            title: t.title,
            body: t.body,
            actions: t.actions,
            onStopAlarm: t.onStopAlarm,
            onFullDismiss: t.onFullDismiss,
          },
        }),
      dismissToast: (reason = "default") =>
        set((s) => {
          const toast = s.toast;
          toast?.onStopAlarm?.();
          if (reason !== "snooze") {
            toast?.onFullDismiss?.();
          }
          return { toast: null };
        }),
    }),
    {
      name: "nexus-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        viewMode: s.viewMode,
        wipLimits: s.wipLimits,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);
