"use client";

import { useCallback, useEffect, useRef } from "react";

const VIEW_H = 180;
const ITEM_H = 36;
/** Vertical padding so first/last items can scroll to the center line */
const EDGE_PAD = VIEW_H / 2 - ITEM_H / 2;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export type TimeWheelPickerProps = {
  valueMinutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

const colStyles =
  "w-[3.25rem] snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth " +
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/**
 * Two-column scroll-snap wheel (hours 00–23, minutes 00–59) for local send time in minutes since midnight.
 */
export function TimeWheelPicker({ valueMinutes, onChange, disabled, "aria-label": ariaLabel }: TimeWheelPickerProps) {
  const safe = clamp(Math.floor(valueMinutes), 0, 1439);
  const hour = Math.floor(safe / 60) % 24;
  const minute = safe % 60;

  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const skipEvent = useRef(false);

  const scrollHourTo = useCallback((h: number) => {
    const el = hourRef.current;
    if (!el) return;
    skipEvent.current = true;
    el.scrollTop = h * ITEM_H;
    window.setTimeout(() => {
      skipEvent.current = false;
    }, 80);
  }, []);

  const scrollMinTo = useCallback((m: number) => {
    const el = minRef.current;
    if (!el) return;
    skipEvent.current = true;
    el.scrollTop = m * ITEM_H;
    window.setTimeout(() => {
      skipEvent.current = false;
    }, 80);
  }, []);

  useEffect(() => {
    scrollHourTo(hour);
  }, [hour, scrollHourTo]);

  useEffect(() => {
    scrollMinTo(minute);
  }, [minute, scrollMinTo]);

  const emitHour = useCallback(() => {
    if (skipEvent.current || disabled) return;
    const el = hourRef.current;
    if (!el) return;
    const newH = clamp(Math.round(el.scrollTop / ITEM_H), 0, 23);
    const next = newH * 60 + minute;
    if (next !== safe) onChange(next);
  }, [disabled, minute, onChange, safe]);

  const emitMin = useCallback(() => {
    if (skipEvent.current || disabled) return;
    const el = minRef.current;
    if (!el) return;
    const newM = clamp(Math.round(el.scrollTop / ITEM_H), 0, 59);
    const next = hour * 60 + newM;
    if (next !== safe) onChange(next);
  }, [disabled, hour, onChange, safe]);

  useEffect(() => {
    const hEl = hourRef.current;
    const mEl = minRef.current;
    if (!hEl || !mEl) return;

    let hT: ReturnType<typeof setTimeout>;
    let mT: ReturnType<typeof setTimeout>;

    const debounce = (fn: () => void, which: "h" | "m") => {
      if (which === "h") {
        clearTimeout(hT);
        hT = setTimeout(fn, 100);
      } else {
        clearTimeout(mT);
        mT = setTimeout(fn, 100);
      }
    };

    const onHScroll = () => debounce(emitHour, "h");
    const onMScroll = () => debounce(emitMin, "m");

    hEl.addEventListener("scroll", onHScroll);
    mEl.addEventListener("scroll", onMScroll);
    hEl.addEventListener("scrollend", emitHour);
    mEl.addEventListener("scrollend", emitMin);

    return () => {
      clearTimeout(hT);
      clearTimeout(mT);
      hEl.removeEventListener("scroll", onHScroll);
      mEl.removeEventListener("scroll", onMScroll);
      hEl.removeEventListener("scrollend", emitHour);
      mEl.removeEventListener("scrollend", emitMin);
    };
  }, [emitHour, emitMin]);

  return (
    <div
      className={disabled ? "pointer-events-none opacity-45" : ""}
      role="group"
      aria-label={ariaLabel ?? "Select time"}
    >
      <div className="relative flex items-stretch justify-center gap-0.5 rounded-xl border border-zinc-700/90 bg-[#08080a] px-1 shadow-inner light:border-zinc-300 light:bg-zinc-100">
        <div
          className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-9 -translate-y-1/2 rounded-md border border-teal-500/35 bg-teal-500/[0.06]"
          aria-hidden
        />
        <div
          ref={hourRef}
          style={{ height: VIEW_H, paddingTop: EDGE_PAD, paddingBottom: EDGE_PAD }}
          className={colStyles}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="flex h-9 shrink-0 snap-center items-center justify-center font-mono text-[15px] tabular-nums text-zinc-100 light:text-zinc-900"
            >
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center pb-px font-mono text-lg font-light text-zinc-500">:</div>
        <div
          ref={minRef}
          style={{ height: VIEW_H, paddingTop: EDGE_PAD, paddingBottom: EDGE_PAD }}
          className={colStyles}
        >
          {Array.from({ length: 60 }, (_, m) => (
            <div
              key={m}
              className="flex h-9 shrink-0 snap-center items-center justify-center font-mono text-[15px] tabular-nums text-zinc-100 light:text-zinc-900"
            >
              {String(m).padStart(2, "0")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
