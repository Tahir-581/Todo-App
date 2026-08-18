"use client";

import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, MessageCircle, Radio, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Channel = "email" | "whatsapp";

type LogItem = {
  key: string;
  channel: Channel;
  title: string;
  summary: string;
  dateStr: string;
  sentAt: string;
};

type ApiResponse = {
  items: LogItem[];
  stats: { emailTotal: number; whatsAppTotal: number };
  settingsHint: {
    reportKindLabel: string;
    dailyProgressEmail: boolean;
    dailyProgressWhatsApp: boolean;
  } | null;
};

type Filter = "all" | Channel;

export default function NotificationLogsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/notification-logs")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(typeof j?.error === "string" ? j.error : "Could not load logs");
        }
        return r.json() as Promise<ApiResponse>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (filter === "all") return items;
    return items.filter((i) => i.channel === filter);
  }, [data?.items, filter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-100 light:text-zinc-900">
            Message log
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Daily progress report deliveries only: each row is a successful send for a given report date (cron or
            &quot;Send now&quot; on Progress Tracker). One entry per channel per day.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/80 disabled:opacity-50 light:border-zinc-300 light:bg-white light:text-zinc-800 light:hover:bg-zinc-50"
        >
          <Radio className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {data?.settingsHint ? (
        <p className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-500 light:border-zinc-200 light:bg-zinc-50">
          Current template:{" "}
          <span className="font-medium text-zinc-300 light:text-zinc-800">{data.settingsHint.reportKindLabel}</span>
          .{" "}
          {!data.settingsHint.dailyProgressEmail && !data.settingsHint.dailyProgressWhatsApp ? (
            <Link href="/settings" className="text-accent hover:underline">
              Turn on daily email or WhatsApp in Settings
            </Link>
          ) : null}
          {(data.settingsHint.dailyProgressEmail || data.settingsHint.dailyProgressWhatsApp) &&
          (!data.settingsHint.dailyProgressEmail || !data.settingsHint.dailyProgressWhatsApp) ? (
            <span className="text-zinc-600">
              {" "}
              Only enabled channels will appear here after sends complete.
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-amber-500/10 to-transparent p-4 light:border-zinc-200 light:from-amber-500/15">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Email sends</p>
              <p className="font-display text-2xl font-semibold text-zinc-100 light:text-zinc-900">
                {loading ? "—" : data?.stats.emailTotal ?? 0}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">One row per report date (deduplicated per day).</p>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-emerald-500/10 to-transparent p-4 light:border-zinc-200 light:from-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">WhatsApp sends</p>
              <p className="font-display text-2xl font-semibold text-zinc-100 light:text-zinc-900">
                {loading ? "—" : data?.stats.whatsAppTotal ?? 0}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">Same report window as email; all configured numbers per send.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "email" as const, label: "Email only" },
            { id: "whatsapp" as const, label: "WhatsApp only" },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === chip.id
                ? "bg-accent text-zinc-950 shadow-accent-glow/20 shadow-md"
                : "border border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 light:border-zinc-300 light:text-zinc-600 light:hover:text-zinc-900"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800/80 light:border-zinc-200">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-800/40 light:bg-zinc-200/60" />
            ))}
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-400">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-500 light:bg-zinc-200">
              <Send className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm text-zinc-400 light:text-zinc-600">No sends logged yet for this filter.</p>
            <Link
              href="/settings"
              className="text-sm font-medium text-accent hover:underline"
            >
              Configure notifications
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/80 light:divide-zinc-200">
            {filtered.map((row) => {
              const sent = new Date(row.sentAt);
              const isEmail = row.channel === "email";
              return (
                <li
                  key={row.key}
                  className="flex gap-3 px-4 py-3.5 sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:mt-0 ${
                        isEmail ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {isEmail ? <Mail className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-200 light:text-zinc-900">{row.title}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                            isEmail
                              ? "bg-amber-500/10 text-amber-500/90"
                              : "bg-emerald-500/10 text-emerald-500/90"
                          }`}
                        >
                          {isEmail ? "Email" : "WhatsApp"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-500">{row.summary}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right sm:pl-2">
                    <p className="font-mono text-xs text-zinc-400 light:text-zinc-600">{format(sent, "PPp")}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{formatDistanceToNow(sent, { addSuffix: true })}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
