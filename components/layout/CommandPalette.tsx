"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  LayoutGrid,
  List,
  CalendarDays,
  Settings,
  ListTodo,
  Folder,
  Send,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { useTaskStore } from "@/store/taskStore";
import { useUiStore, type ViewMode } from "@/store/uiStore";

type Project = { id: string; name: string; emoji: string };

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [hits, setHits] = useState<{ id: string; title: string; taskRef: number }[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo((): { id: string; label: string; run: () => void; icon?: ReactNode }[] => {
    const base: { id: string; label: string; run: () => void; icon?: ReactNode }[] = [
      {
        id: "create",
        label: "Create task",
        run: () => {
          router.push("/tasks?view=list");
          setOpen(false);
        },
        icon: <ListTodo className="h-4 w-4" />,
      },
      {
        id: "dash",
        label: "Go to Dashboard",
        run: () => {
          router.push("/dashboard");
          setOpen(false);
        },
      },
      {
        id: "settings",
        label: "Open settings",
        run: () => {
          router.push("/settings");
          setOpen(false);
        },
        icon: <Settings className="h-4 w-4" />,
      },
      {
        id: "ideas",
        label: "Idea Parking Lot",
        run: () => {
          router.push("/ideas");
          setOpen(false);
        },
        icon: <Lightbulb className="h-4 w-4" />,
      },
      {
        id: "wa-schedule",
        label: "Open WhatsApp & daily report schedule",
        run: () => {
          router.push("/whatsapp-schedule");
          setOpen(false);
        },
        icon: <CalendarClock className="h-4 w-4" />,
      },
      {
        id: "msglog",
        label: "Open message log (email & WhatsApp)",
        run: () => {
          router.push("/notification-logs");
          setOpen(false);
        },
        icon: <Send className="h-4 w-4" />,
      },
      {
        id: "list",
        label: "Switch to List view",
        run: () => {
          goView("list");
        },
        icon: <List className="h-4 w-4" />,
      },
      {
        id: "kanban",
        label: "Switch to Kanban view",
        run: () => {
          goView("kanban");
        },
        icon: <LayoutGrid className="h-4 w-4" />,
      },
      {
        id: "cal",
        label: "Switch to Calendar view",
        run: () => {
          goView("calendar");
        },
        icon: <CalendarDays className="h-4 w-4" />,
      },
    ];
    const projItems = projects.map((p) => ({
      id: `p-${p.id}`,
      label: `Go to project ${p.emoji} ${p.name}`,
      run: () => {
        router.push(`/project/${p.id}`);
        setOpen(false);
      },
      icon: <Folder className="h-4 w-4" />,
    }));
    const taskItems = hits.map((t) => ({
      id: `t-${t.id}`,
      label: `${t.title} (#${t.taskRef})`,
      run: () => {
        useTaskStore.getState().setSelectedTaskId(t.id);
        router.push("/tasks");
        setOpen(false);
      },
    }));
    const low = q.trim().toLowerCase();
    const merged = [...taskItems, ...projItems, ...base];
    if (!low) return merged;
    return merged.filter((i) => i.label.toLowerCase().includes(low));
  }, [q, projects, hits, router, setOpen]);

  function goView(v: ViewMode) {
    setViewMode(v);
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    params.set("view", v);
    router.push(`/tasks?${params.toString()}`);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]));
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/tasks?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((data: { id: string; title: string; taskRef: number }[]) => setHits(data.slice(0, 8)))
        .catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && items[sel]) {
        e.preventDefault();
        items[sel].run();
      }
    },
    [items, sel, setOpen]
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[150] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
          >
            <div className="border-b border-zinc-800 p-3">
              <Input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tasks or run a command…"
                className="border-0 bg-transparent focus:ring-0"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto py-2">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-zinc-500">No matches</li>
              ) : (
                items.map((item, idx) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.run()}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                        idx === sel ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-zinc-500">{item.icon ?? null}</span>
                      {item.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
              <kbd className="rounded border border-zinc-700 bg-black/30 px-1">↑</kbd>{" "}
              <kbd className="rounded border border-zinc-700 bg-black/30 px-1">↓</kbd> navigate ·{" "}
              <kbd className="rounded border border-zinc-700 bg-black/30 px-1">↵</kbd> select ·{" "}
              <kbd className="rounded border border-zinc-700 bg-black/30 px-1">esc</kbd> close
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
