"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { STATUS_LABELS, STATUS_ORDER, STATUS_THEME } from "@/lib/constants";
import type { TaskListTask } from "@/store/taskStore";
import type { TaskStatus } from "@prisma/client";
import { StatusColumnHeaderIcon } from "./StatusColumnHeaderIcon";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function TaskListView({
  tasks,
  onOpenTask,
  onTitleSave,
  onQuickAdd,
}: {
  tasks: TaskListTask[];
  onOpenTask: (id: string) => void;
  onTitleSave: (id: string, title: string) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STATUS_ORDER.map((s) => [s, true]))
  );
  const [drafts, setDrafts] = useState<Partial<Record<TaskStatus, string>>>({});

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, TaskListTask[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      TODAY_DONE: [],
      DONE: [],
      CANCELLED: [],
    };
    for (const t of tasks) {
      g[t.status].push(t);
    }
    return g;
  }, [tasks]);

  return (
    <div className="space-y-4">
      {STATUS_ORDER.map((status) => {
        const list = grouped[status];
        const isOpen = open[status] !== false;
        const th = STATUS_THEME[status];
        return (
          <div key={status} className={`overflow-hidden ${th.listSection}`}>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors ${th.listHeaderRow}`}
              onClick={() => setOpen((o) => ({ ...o, [status]: !isOpen }))}
            >
              {isOpen ? (
                <ChevronDown className={`h-4 w-4 shrink-0 ${th.listChevron}`} />
              ) : (
                <ChevronRight className={`h-4 w-4 shrink-0 ${th.listChevron}`} />
              )}
              <StatusColumnHeaderIcon status={status} />
              <span className={`font-medium ${th.listTitle}`}>{STATUS_LABELS[status]}</span>
              <span className={`ml-auto font-mono text-xs ${th.listCount}`}>{list.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`border-t ${th.listDivider}`}
                >
                  <div className="space-y-2 p-3">
                    {list.map((task, i) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <InlineTitleTask
                          task={task}
                          onOpen={() => onOpenTask(task.id)}
                          onTitleSave={onTitleSave}
                        />
                      </motion.div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder={`Quick add to ${STATUS_LABELS[status]}…`}
                        value={drafts[status] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [status]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (drafts[status] ?? "").trim();
                            if (v) {
                              onQuickAdd(status, v);
                              setDrafts((d) => ({ ...d, [status]: "" }));
                            }
                          }
                        }}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          const v = (drafts[status] ?? "").trim();
                          if (v) {
                            onQuickAdd(status, v);
                            setDrafts((d) => ({ ...d, [status]: "" }));
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function InlineTitleTask({
  task,
  onOpen,
  onTitleSave,
}: {
  task: TaskListTask;
  onOpen: () => void;
  onTitleSave: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.title);

  if (editing) {
    return (
      <Input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (val.trim() && val !== task.title) onTitleSave(task.id, val.trim());
          else setVal(task.title);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setVal(task.title);
            setEditing(false);
          }
        }}
        className="text-sm"
      />
    );
  }

  return (
    <div onDoubleClick={() => setEditing(true)}>
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}
