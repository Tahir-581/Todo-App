"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

export type ToastData = {
  id: string;
  title: string;
  body?: string;
  actions?: ReactNode;
  /** Stop looping reminder audio (Snooze, Dismiss, ✕). */
  onStopAlarm?: () => void;
  /** One-shot dismiss cleanup (Dismiss, ✕ — not Snooze). */
  onFullDismiss?: () => void;
};

export function ToastHost({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-6 left-1/2 z-[9999] w-[min(500px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border-2 border-primary/50 bg-surface p-6 shadow-[0_0_50px_-12px_rgba(var(--primary-rgb),0.5)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-white">{toast.title}</p>
              {toast.body ? <p className="mt-1 text-sm text-zinc-400">{toast.body}</p> : null}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-zinc-500 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
          {toast.actions ? <div className="mt-3 flex flex-wrap gap-2">{toast.actions}</div> : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
