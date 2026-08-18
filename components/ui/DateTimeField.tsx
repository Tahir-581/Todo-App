"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type DateTimeFieldProps = {
  label: string;
  value: string | null;
  onCommit: (iso: string | null) => void;
};

function parseValue(iso: string | null): { date: Date; h: number; m: number } {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return { date: d, h: d.getHours(), m: d.getMinutes() };
    }
  }
  const now = new Date();
  return { date: now, h: now.getHours(), m: now.getMinutes() };
}

function combineLocal(date: Date, hour: number, minute: number): string {
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0
  );
  return d.toISOString();
}

export function DateTimeField({ label, value, onCommit }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minScrollRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState({ top: 0, left: 0, width: 320 });

  const initial = parseValue(value);
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(initial.date));
  const [selectedDay, setSelectedDay] = useState(() => initial.date);
  const [hour, setHour] = useState(initial.h);
  const [minute, setMinute] = useState(initial.m);

  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    setCursorMonth(startOfMonth(p.date));
    setSelectedDay(p.date);
    setHour(p.h);
    setMinute(p.m);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      hourScrollRef.current
        ?.querySelector(`[data-hour="${hour}"]`)
        ?.scrollIntoView({ block: "center" });
      minScrollRef.current
        ?.querySelector(`[data-minute="${minute}"]`)
        ?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(t);
  }, [open, hour, minute]);

  const updatePlacement = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(360, window.innerWidth - 16);
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (left < 8) left = 8;
    let top = r.bottom + 8;
    const estHeight = 440;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, r.top - estHeight - 8);
    }
    setPlacement({ top, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
    const onWin = () => updatePlacement();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const monthStart = startOfMonth(cursorMonth);
  const monthEnd = endOfMonth(cursorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const display =
    value && !Number.isNaN(new Date(value).getTime())
      ? format(new Date(value), "MMM d, yyyy · HH:mm")
      : null;

  function apply() {
    onCommit(combineLocal(selectedDay, hour, minute));
    setOpen(false);
  }

  function clear() {
    onCommit(null);
    setOpen(false);
  }

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <motion.div
            ref={popRef}
            role="dialog"
            aria-label={`${label} picker`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed z-[250] rounded-xl border border-zinc-700 bg-[#141416] p-3 shadow-2xl shadow-black/60 light:border-zinc-200 light:bg-white"
            style={{
              top: placement.top,
              left: placement.left,
              width: placement.width,
              maxWidth: "calc(100vw - 16px)",
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    onClick={() => setCursorMonth((m) => addMonths(m, -1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-zinc-200 light:text-zinc-900">
                    {format(cursorMonth, "MMMM yyyy")}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    onClick={() => setCursorMonth((m) => addMonths(m, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {days.map((day) => {
                    const muted = !isSameMonth(day, cursorMonth);
                    const sel = isSameDay(day, selectedDay);
                    const today = isToday(day);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          muted ? "text-zinc-600" : "text-zinc-200 light:text-zinc-800"
                        } ${
                          sel
                            ? "bg-accent text-white shadow-lg shadow-accent/30"
                            : "hover:bg-white/10 light:hover:bg-zinc-100"
                        } ${today && !sel ? "ring-1 ring-accent/50" : ""}`}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex shrink-0 gap-2 border-t border-zinc-800 pt-3 sm:w-[148px] sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 light:border-zinc-200">
                <div className="flex-1">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    <Clock className="h-3 w-3" />
                    Hour
                  </p>
                  <div
                    ref={hourScrollRef}
                    className="max-h-[220px] overflow-y-auto rounded-lg border border-zinc-800 bg-[#0D0D0F] light:border-zinc-200 light:bg-zinc-50"
                  >
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        data-hour={h}
                        onClick={() => setHour(h)}
                        className={`block w-full px-2 py-1.5 text-center font-mono text-xs ${
                          hour === h
                            ? "bg-accent/25 text-indigo-200"
                            : "text-zinc-400 hover:bg-white/5 light:hover:bg-zinc-100"
                        }`}
                      >
                        {String(h).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Minute
                  </p>
                  <div
                    ref={minScrollRef}
                    className="max-h-[220px] overflow-y-auto rounded-lg border border-zinc-800 bg-[#0D0D0F] light:border-zinc-200 light:bg-zinc-50"
                  >
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        data-minute={m}
                        onClick={() => setMinute(m)}
                        className={`block w-full px-2 py-1.5 text-center font-mono text-xs ${
                          minute === m
                            ? "bg-accent/25 text-indigo-200"
                            : "text-zinc-400 hover:bg-white/5 light:hover:bg-zinc-100"
                        }`}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3 light:border-zinc-200">
              <button
                type="button"
                onClick={apply}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 light:border-zinc-300"
              >
                Clear
              </button>
            </div>
          </motion.div>,
          document.body
        )
      : null;

  return (
    <div>
      <label className="text-xs text-zinc-500">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-[#121214] px-3 py-2.5 text-left text-sm outline-none ring-accent/30 transition-colors hover:border-zinc-600 focus:border-accent focus:ring-2 light:border-zinc-200 light:bg-white"
      >
        <span
          className={
            display
              ? "font-mono text-zinc-200 light:text-zinc-900"
              : "text-zinc-500"
          }
        >
          {display ?? "Select date & time…"}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>
      {panel}
    </div>
  );
}
