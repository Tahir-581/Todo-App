"use client";

import { motion } from "framer-motion";
import type { TaskPriority, TaskRecurrence, TaskStatus } from "@prisma/client";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PRIORITY_LABELS, RECURRENCE_LABELS, STATUS_LABELS, STATUS_THEME } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";

export type CreateTaskPayload = {
  title: string;
  description: string;
  deadline: string | null;
  reminderAt: string | null;
  priority: TaskPriority;
  deadlineRecurrence: TaskRecurrence;
  reminderRecurrence: TaskRecurrence;
};

type AddTaskModalProps = {
  open: boolean;
  status: TaskStatus;
  onClose: () => void;
  onCreate: (payload: CreateTaskPayload) => Promise<void>;
};

export function AddTaskModal({ open, status, onClose, onCreate }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [deadlineRecurrence, setDeadlineRecurrence] = useState<TaskRecurrence>("NONE");
  const [reminderRecurrence, setReminderRecurrence] = useState<TaskRecurrence>("NONE");
  const [priority, setPriority] = useState<TaskPriority>("NONE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setDeadline(null);
    setReminderAt(null);
    setDeadlineRecurrence("NONE");
    setReminderRecurrence("NONE");
    setPriority("NONE");
    setError(null);
    setSaving(false);
  }, [open, status]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit() {
    const t = title.trim();
    if (!t) {
      setError("Title is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onCreate({
        title: t,
        description: description.trim(),
        deadline,
        reminderAt,
        priority,
        deadlineRecurrence,
        reminderRecurrence,
      });
      onClose();
    } catch {
      setError("Could not create task");
    } finally {
      setSaving(false);
    }
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[120]">
            <motion.div
              role="presentation"
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-labelledby="add-task-title"
              aria-modal="true"
              className="absolute left-1/2 top-[max(1rem,8vh)] w-[min(440px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-[#141416] p-6 shadow-2xl light:border-zinc-200 light:bg-white"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-accent">New task</p>
                  <h2
                    id="add-task-title"
                    className={`font-display text-xl font-semibold tracking-tight ${STATUS_THEME[status].modalAccent}`}
                  >
                    Add to {STATUS_LABELS[status]}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs text-zinc-500">Title</label>
                  <Input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="mt-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void submit();
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context…"
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 outline-none ring-accent/30 focus:border-accent focus:ring-2 light:bg-zinc-50 light:text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Priority</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <DateTimeField
                  label="Deadline (optional)"
                  value={deadline}
                  onCommit={(iso) => setDeadline(iso)}
                />
                <div>
                  <label className="text-xs text-zinc-500">Repeat deadline</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                    value={deadlineRecurrence}
                    onChange={(e) => setDeadlineRecurrence(e.target.value as TaskRecurrence)}
                  >
                    {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map((r) => (
                      <option key={r} value={r}>
                        {RECURRENCE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <DateTimeField
                  label="Reminder (optional)"
                  value={reminderAt}
                  onCommit={(iso) => setReminderAt(iso)}
                />
                <div>
                  <label className="text-xs text-zinc-500">Repeat reminder</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#121214] px-2 py-2 text-sm light:bg-white"
                    value={reminderRecurrence}
                    onChange={(e) => setReminderRecurrence(e.target.value as TaskRecurrence)}
                  >
                    {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map((r) => (
                      <option key={r} value={r}>
                        {RECURRENCE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
              </div>

              <div className="mt-6 flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1" loading={saving} onClick={() => void submit()}>
                  Create task
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      : null;

  return <>{modal}</>;
}
