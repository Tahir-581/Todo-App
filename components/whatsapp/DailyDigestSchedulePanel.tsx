"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimeWheelPicker } from "@/components/ui/TimeWheelPicker";
import { normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";
import { formatMinutesAs12h, minutesSinceMidnightToHHMM } from "@/lib/reminderTime";
import { useUiStore } from "@/store/uiStore";
import {
  CalendarClock,
  Clock,
  Mail,
  MessageCircle,
  Radio,
  Server,
  Plus,
  Sparkles,
} from "lucide-react";

export type DailyEmailReportKind = "PROGRESS_TRACKER" | "ALL_TASKS" | "ALL_REPORTS";

const DAILY_REPORT_OPTIONS: { value: DailyEmailReportKind; label: string; description: string }[] = [
  { value: "PROGRESS_TRACKER", label: "Progress tracker", description: "Yesterday’s habit checkmarks." },
  { value: "ALL_TASKS", label: "All tasks", description: "Every task and its current status." },
  { value: "ALL_REPORTS", label: "All reports", description: "Progress tracker + all tasks in one email." },
];

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  whatsappPhone: string | null;
  dailyProgressEmail: boolean;
  dailyProgressWhatsApp: boolean;
  dailyReportSendMinutes: number[];
  dailyEmailReportKind: DailyEmailReportKind;
  reportTimeZone: string | null;
  theme: string;
};

type DigestScheduleStatus = {
  timeZone: string;
  todayLocal: string;
  localMinutes: number;
  scheduledMinutesList: number[];
  digestReady: boolean;
  slots: Array<{ minutes: number; digestReady: boolean; whatsappDigestLogged: boolean }>;
  whatsappDigestLoggedToday: boolean;
};

function slotsEqual(a: number[], b: number[]) {
  const x = normalizeDailyReportSendMinutes(a);
  const y = normalizeDailyReportSendMinutes(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export function DailyDigestSchedulePanel() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [digestLive, setDigestLive] = useState<DigestScheduleStatus | null>(null);
  const [recipients, setRecipients] = useState<{ id: string; email: string; createdAt: string }[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientSaving, setRecipientSaving] = useState(false);
  const [whatsappRecipients, setWhatsappRecipients] = useState<
    { id: string; phone: string; createdAt: string }[]
  >([]);
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState("");
  const [whatsappRecipientsLoading, setWhatsappRecipientsLoading] = useState(false);
  const [whatsappRecipientSaving, setWhatsappRecipientSaving] = useState(false);
  const [sendReportNowLoading, setSendReportNowLoading] = useState(false);
  const [sendWhatsappReportNowLoading, setSendWhatsappReportNowLoading] = useState(false);
  const [scheduleDraftSlots, setScheduleDraftSlots] = useState<number[]>([540]);
  const [scheduleLogLines, setScheduleLogLines] = useState<string[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [waBotConfigured, setWaBotConfigured] = useState<boolean | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        setUser({
          id: u.id as string,
          ...u,
          dailyReportSendMinutes: normalizeDailyReportSendMinutes(u.dailyReportSendMinutes),
          dailyEmailReportKind: u.dailyEmailReportKind ?? "PROGRESS_TRACKER",
          whatsappNotifications: Boolean(u.whatsappNotifications),
          whatsappPhone: u.whatsappPhone ?? null,
          dailyProgressWhatsApp: Boolean(u.dailyProgressWhatsApp),
          reportTimeZone: u.reportTimeZone ?? null,
        });
        setScheduleDraftSlots(normalizeDailyReportSendMinutes(u.dailyReportSendMinutes));
        void fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportTzOffsetMinutes: new Date().getTimezoneOffset(),
            reportTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });
      });

    setRecipientsLoading(true);
    setWhatsappRecipientsLoading(true);
    fetch("/api/notifications/recipients")
      .then((r) => r.json())
      .then((data) => setRecipients(Array.isArray(data?.recipients) ? data.recipients : []))
      .finally(() => setRecipientsLoading(false));
    fetch("/api/notifications/whatsapp-recipients")
      .then((r) => r.json())
      .then((data) => setWhatsappRecipients(Array.isArray(data?.recipients) ? data.recipients : []))
      .finally(() => setWhatsappRecipientsLoading(false));
    fetch("/api/notifications/whatsapp-bot-status")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setWaBotConfigured(Boolean(d?.configured)))
      .catch(() => setWaBotConfigured(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    function refreshDigestLive() {
      void fetch("/api/user/digest-schedule-status")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: DigestScheduleStatus | null) => {
          if (d && typeof d.localMinutes === "number") setDigestLive(d);
        })
        .catch(() => {});
    }
    refreshDigestLive();
    const id = window.setInterval(refreshDigestLive, 15000);
    return () => window.clearInterval(id);
  }, [user?.id]);

  async function toggleDailyProgress(on: boolean) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyProgressEmail: on }),
    });
    if (res.ok) {
      const j = (await res.json()) as UserRow & { dailyReportSendMinutes?: number[] };
      setUser({ ...j, dailyReportSendMinutes: normalizeDailyReportSendMinutes(j.dailyReportSendMinutes) });
    }
  }

  async function toggleDailyProgressWhatsApp(on: boolean) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyProgressWhatsApp: on }),
    });
    if (res.ok) {
      const j = (await res.json()) as UserRow & { dailyReportSendMinutes?: number[] };
      setUser({ ...j, dailyReportSendMinutes: normalizeDailyReportSendMinutes(j.dailyReportSendMinutes) });
    }
  }

  async function commitDailySchedule() {
    if (!user) return;
    const minutesList = normalizeDailyReportSendMinutes(scheduleDraftSlots);
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyReportSendMinutes: minutesList }),
      });
      const raw = await res.json().catch(() => null);
      if (
        res.ok &&
        raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { dailyReportSendMinutes?: unknown }).dailyReportSendMinutes)
      ) {
        const data = raw as {
          dailyReportSendMinutes: number[];
          dailyEmailReportKind?: DailyEmailReportKind | null;
          dailyProgressEmail?: boolean;
          dailyProgressWhatsApp?: boolean;
          reportTimeZone?: string | null;
          name?: string | null;
          email?: string;
          avatar?: string | null;
          emailNotifications?: boolean;
          whatsappNotifications?: boolean;
          whatsappPhone?: string | null;
          theme?: string;
        };
        const savedSlots = normalizeDailyReportSendMinutes(data.dailyReportSendMinutes);
        setUser({
          id: user.id,
          name: data.name ?? null,
          email: data.email ?? user.email,
          avatar: data.avatar ?? null,
          emailNotifications: Boolean(data.emailNotifications),
          whatsappNotifications: Boolean(data.whatsappNotifications),
          whatsappPhone: data.whatsappPhone ?? null,
          dailyProgressEmail: Boolean(data.dailyProgressEmail),
          dailyProgressWhatsApp: Boolean(data.dailyProgressWhatsApp),
          dailyReportSendMinutes: savedSlots,
          dailyEmailReportKind: (data.dailyEmailReportKind ?? "PROGRESS_TRACKER") as DailyEmailReportKind,
          reportTimeZone: data.reportTimeZone ?? null,
          theme: data.theme ?? user.theme,
        });
        setScheduleDraftSlots(savedSlots);
        const botStatusRes = await fetch("/api/notifications/whatsapp-bot-status")
          .then((r) => r.json())
          .catch(() => ({}));
        const botOk = Boolean((botStatusRes as { configured?: boolean })?.configured);
        setWaBotConfigured(botOk);
        const tz =
          data.reportTimeZone?.trim() ||
          (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "local");
        const timesLabel = savedSlots
          .map((m) => `${minutesSinceMidnightToHHMM(m)} (${formatMinutesAs12h(m)})`)
          .join(", ");
        const kind =
          DAILY_REPORT_OPTIONS.find((o) => o.value === (data.dailyEmailReportKind ?? "PROGRESS_TRACKER"))?.label ??
          "Daily report";
        const channels = [
          data.dailyProgressEmail ? "email" : null,
          data.dailyProgressWhatsApp ? "whatsapp" : null,
        ].filter(Boolean);
        const line = `[${new Date().toISOString()}] task=daily_digest  report="${kind}"  local_times=${timesLabel}  tz=${tz}  channels=[${channels.join(", ") || "none"}]  server_bot=${botOk ? "ok" : "missing"}`;
        setScheduleLogLines((prev) => [...prev.slice(-48), line]);
        showToast({
          title: "Schedule saved",
          body: `Daily sends at: ${timesLabel} (${tz}).`,
        });
        void fetch("/api/user/digest-schedule-status")
          .then((r) => (r.ok ? r.json() : null))
          .then((d: DigestScheduleStatus | null) => {
            if (d && typeof d.localMinutes === "number") setDigestLive(d);
          });
      } else {
        showToast({ title: "Could not save time", body: "Try again." });
      }
    } finally {
      setScheduleSaving(false);
    }
  }

  async function setDailyEmailReportKind(kind: DailyEmailReportKind) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyEmailReportKind: kind }),
    });
    if (res.ok) {
      const j = (await res.json()) as UserRow & { dailyReportSendMinutes?: number[] };
      setUser({ ...j, dailyReportSendMinutes: normalizeDailyReportSendMinutes(j.dailyReportSendMinutes) });
    }
  }

  async function addRecipient() {
    const email = recipientEmail.trim();
    if (!email) return;
    setRecipientSaving(true);
    try {
      const res = await fetch("/api/notifications/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ title: "Could not add email", body: data?.error ? JSON.stringify(data.error) : "Invalid email." });
        return;
      }
      setRecipientEmail("");
      const listRes = await fetch("/api/notifications/recipients");
      const list = await listRes.json().catch(() => ({}));
      setRecipients(Array.isArray(list?.recipients) ? list.recipients : []);
    } finally {
      setRecipientSaving(false);
    }
  }

  async function removeRecipient(email: string) {
    setRecipientSaving(true);
    try {
      await fetch("/api/notifications/recipients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setRecipients((xs) => xs.filter((x) => x.email !== email));
    } finally {
      setRecipientSaving(false);
    }
  }

  async function addWhatsappReportRecipient() {
    const phone = whatsappRecipientPhone.trim();
    if (!phone) return;
    setWhatsappRecipientSaving(true);
    try {
      const res = await fetch("/api/notifications/whatsapp-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data?.error?.fieldErrors?.phone?.[0] as string | undefined;
        showToast({ title: "Could not add number", body: err || "Check E.164 format (+country code)." });
        return;
      }
      setWhatsappRecipientPhone("");
      const listRes = await fetch("/api/notifications/whatsapp-recipients");
      const list = await listRes.json().catch(() => ({}));
      setWhatsappRecipients(Array.isArray(list?.recipients) ? list.recipients : []);
    } finally {
      setWhatsappRecipientSaving(false);
    }
  }

  async function removeWhatsappReportRecipient(phone: string) {
    setWhatsappRecipientSaving(true);
    try {
      await fetch("/api/notifications/whatsapp-recipients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setWhatsappRecipients((xs) => xs.filter((x) => x.phone !== phone));
    } finally {
      setWhatsappRecipientSaving(false);
    }
  }

  async function sendProgressReportNow() {
    setSendReportNowLoading(true);
    try {
      const res = await fetch("/api/progress-tracker/report/send-now", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        subject?: string;
        recipientCount?: number;
        error?: string;
        hint?: string;
        detail?: string;
      };
      if (res.ok && data.ok) {
        showToast({
          title: "Report sent",
          body: data.subject
            ? `${data.subject} — ${data.recipientCount ?? 0} recipient(s).`
            : `Emailed to ${data.recipientCount ?? 0} address(es).`,
        });
      } else {
        const extra = data.hint ? ` ${data.hint}` : data.detail ? ` ${data.detail}` : "";
        showToast({
          title: "Could not send report",
          body: (data.error || "Something went wrong.") + extra,
        });
      }
    } finally {
      setSendReportNowLoading(false);
    }
  }

  async function sendProgressReportWhatsAppNow() {
    setSendWhatsappReportNowLoading(true);
    try {
      const res = await fetch("/api/progress-tracker/report/send-now/whatsapp", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        subjectLine?: string;
        recipientCount?: number;
        error?: string;
        hint?: string;
        detail?: string;
      };
      if (res.ok && data.ok) {
        const n = typeof data.recipientCount === "number" ? data.recipientCount : 1;
        showToast({
          title: "WhatsApp report sent",
          body: data.subjectLine
            ? `${data.subjectLine} — ${n} number(s).`
            : `Sent to ${n} number(s). Check WhatsApp.`,
        });
      } else {
        const extra = data.hint ? ` ${data.hint}` : data.detail ? ` ${data.detail}` : "";
        showToast({
          title: "Could not send WhatsApp report",
          body: (data.error || "Something went wrong.") + extra,
        });
      }
    } finally {
      setSendWhatsappReportNowLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-800/40 light:bg-zinc-200/50" />
        ))}
      </div>
    );
  }

  const dailyScheduleEnabled = user.dailyProgressEmail || user.dailyProgressWhatsApp;
  const hasDailyReportWhatsAppTarget =
    Boolean(user.whatsappPhone?.trim()) || whatsappRecipients.length > 0;
  const scheduleDirty = !slotsEqual(scheduleDraftSlots, user.dailyReportSendMinutes);
  const tzLabel =
    user.reportTimeZone?.trim() ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Local");

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-zinc-800/80 bg-surface/60 p-4 light:border-zinc-200 light:bg-white"
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <Server className="h-3.5 w-3.5 text-emerald-400/90" />
            Selenium bot
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-100 light:text-zinc-900">
            {waBotConfigured === null ? "…" : waBotConfigured ? "Configured" : "Not available"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Scheduled WhatsApp needs <code className="rounded bg-black/20 px-1 text-[10px]">whatsapp_bot.py</code> on the
            server.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-zinc-800/80 bg-surface/60 p-4 light:border-zinc-200 light:bg-white"
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <Clock className="h-3.5 w-3.5 text-sky-400/90" />
            Timezone
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-zinc-100 light:text-zinc-900" title={tzLabel}>
            {tzLabel}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Send time uses your local zone.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-zinc-800/80 bg-surface/60 p-4 light:border-zinc-200 light:bg-white"
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <Radio className="h-3.5 w-3.5 text-violet-400/90" />
            Channels
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-100 light:text-zinc-900">
            {[user.dailyProgressEmail && "Email", user.dailyProgressWhatsApp && "WhatsApp"].filter(Boolean).join(" · ") ||
              "None"}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Toggle below to enable delivery.</p>
        </motion.div>
      </div>

      {digestLive ? (
        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.06] p-4 light:border-sky-300 light:bg-sky-50/80">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-400/90 light:text-sky-700">
            Live schedule gate (same check as the cron job)
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200 light:text-zinc-800">
            <span className="font-mono">{minutesSinceMidnightToHHMM(digestLive.localMinutes)}</span> now in{" "}
            <span className="font-medium">{digestLive.timeZone}</span>.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-200 light:text-zinc-800">
            {(digestLive.slots ?? []).map((s) => (
              <li key={s.minutes} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-zinc-100 light:text-zinc-900">
                  {minutesSinceMidnightToHHMM(s.minutes)}
                </span>
                <span className="text-zinc-500">—</span>
                {s.digestReady ? (
                  <span className="text-emerald-400 light:text-emerald-700">time reached; next cron can send</span>
                ) : (
                  <span className="text-amber-300/95 light:text-amber-800">waiting for this local time</span>
                )}
                {user.dailyProgressWhatsApp && s.whatsappDigestLogged ? (
                  <span className="text-xs text-zinc-500">
                    (WhatsApp for {digestLive.todayLocal} at this slot already logged)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="rounded-2xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 light:text-zinc-900">Delivery channels</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Same report content for each channel. Turn on WhatsApp in{" "}
                <Link href="/settings" className="text-accent underline-offset-2 hover:underline">
                  Settings
                </Link>{" "}
                first.
              </p>
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800/60 bg-black/20 px-4 py-3 light:border-zinc-200 light:bg-zinc-50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-600"
              checked={user.dailyProgressEmail}
              onChange={(e) => void toggleDailyProgress(e.target.checked)}
            />
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-medium text-zinc-200 light:text-zinc-900">Daily email report</span>
            </div>
          </label>

          <label
            className={`mt-3 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
              !user.whatsappNotifications
                ? "cursor-not-allowed border-zinc-800/40 opacity-50"
                : "border-zinc-800/60 bg-black/20 light:border-zinc-200 light:bg-zinc-50"
            }`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-600"
              checked={user.dailyProgressWhatsApp}
              disabled={!user.whatsappNotifications}
              onChange={(e) => void toggleDailyProgressWhatsApp(e.target.checked)}
            />
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-zinc-200 light:text-zinc-900">Daily WhatsApp report</span>
            </div>
          </label>

          {!user.whatsappNotifications ? (
            <p className="mt-3 text-xs text-amber-200/90 light:text-amber-900">
              Enable <strong className="font-medium">WhatsApp notifications</strong> in Settings to use daily WhatsApp.
            </p>
          ) : null}

          {user.dailyProgressWhatsApp && waBotConfigured === false ? (
            <div className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 text-xs leading-relaxed text-amber-100 light:border-amber-400/50 light:bg-amber-50 light:text-amber-950">
              <span className="font-semibold">Scheduled WhatsApp cannot run on this host:</span> deploy with{" "}
              <code className="rounded bg-black/20 px-1 text-[11px] light:bg-white/80">whatsapp_bot.py</code> or run the
              app where Selenium can start Chrome. Use <strong>Send now</strong> from a dev machine to test.
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white lg:col-span-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 light:text-zinc-900">Report content</h2>
              <p className="mt-1 text-xs text-zinc-500">Applies to both email and WhatsApp (plain text for WA).</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <label className="text-xs font-medium text-zinc-500">Type</label>
            <select
              className="w-full rounded-xl border border-zinc-700 bg-[#0D0D0F] px-3 py-3 text-sm text-zinc-100 outline-none ring-accent/40 focus:border-accent focus:ring-2 light:bg-white light:border-zinc-200 light:text-zinc-900 disabled:opacity-50"
              value={user.dailyEmailReportKind ?? "PROGRESS_TRACKER"}
              onChange={(e) => void setDailyEmailReportKind(e.target.value as DailyEmailReportKind)}
              disabled={!dailyScheduleEnabled}
            >
              {DAILY_REPORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              {DAILY_REPORT_OPTIONS.find((o) => o.value === user.dailyEmailReportKind)?.description}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 light:text-zinc-900">Send times</h2>
            <p className="mt-1 max-w-xl text-xs text-zinc-500">
              Add one or more local times per day. Each time fires independently (email and WhatsApp each at most once per
              slot per day). Your dev server polls automatically; production needs a scheduler calling the cron URL about
              every minute.
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-400">
              Saved:{" "}
              {normalizeDailyReportSendMinutes(user.dailyReportSendMinutes)
                .map((m) => `${minutesSinceMidnightToHHMM(m)} (${formatMinutesAs12h(m)})`)
                .join(" · ") || "—"}
              {scheduleDirty ? (
                <span className="ml-2 text-amber-500/90">· unsaved</span>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="shrink-0"
            loading={scheduleSaving}
            disabled={!dailyScheduleEnabled || !scheduleDirty}
            onClick={() => void commitDailySchedule()}
          >
            Save times
          </Button>
        </div>
        <div className="mt-6 space-y-6">
          {scheduleDraftSlots.map((slotMin, index) => (
            <div
              key={`${index}-${slotMin}`}
              className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
              <div className="flex justify-center sm:justify-start">
                <TimeWheelPicker
                  aria-label={`Daily report send time ${index + 1}`}
                  valueMinutes={slotMin}
                  onChange={(v) =>
                    setScheduleDraftSlots((prev) => {
                      const next = [...prev];
                      next[index] = Math.max(0, Math.min(1439, Math.floor(v)));
                      return next;
                    })
                  }
                  disabled={!dailyScheduleEnabled}
                />
              </div>
              <div className="flex justify-center gap-2 sm:justify-end">
                {scheduleDraftSlots.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    disabled={!dailyScheduleEnabled}
                    onClick={() =>
                      setScheduleDraftSlots((prev) => prev.filter((_, j) => j !== index))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          <div className="flex justify-center sm:justify-start">
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-xs"
              disabled={!dailyScheduleEnabled || scheduleDraftSlots.length >= 48}
              onClick={() =>
                setScheduleDraftSlots((prev) => [...prev, prev[prev.length - 1] ?? 540])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add another time
            </Button>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#050506] light:border-zinc-300 light:bg-zinc-950">
          <div className="border-b border-zinc-800/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 light:border-zinc-700 light:text-zinc-400">
            Schedule log
          </div>
          <pre
            className="min-h-[5rem] max-h-48 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-400/95 [text-shadow:0_0_12px_rgba(52,211,153,0.12)] light:text-emerald-600"
            role="log"
            aria-live="polite"
          >
            {scheduleLogLines.length > 0 ? (
              scheduleLogLines.join("\n")
            ) : (
              <span className="text-zinc-600 light:text-zinc-500">
                # Save a send time to register the window and append a line here.
              </span>
            )}
          </pre>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
        <h2 className="text-base font-semibold text-zinc-100 light:text-zinc-900">Try now</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Manual sends do not fill scheduled slot logs; they won&apos;t block your next timed send.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            loading={sendReportNowLoading}
            disabled={!user.dailyProgressEmail}
            onClick={() => void sendProgressReportNow()}
          >
            Send report now (email)
          </Button>
          <Button
            type="button"
            variant="outline"
            loading={sendWhatsappReportNowLoading}
            disabled={
              !user.dailyProgressWhatsApp || !user.whatsappNotifications || !hasDailyReportWhatsAppTarget
            }
            onClick={() => void sendProgressReportWhatsAppNow()}
          >
            Send report now (WhatsApp)
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
          <h2 className="text-sm font-semibold text-zinc-200 light:text-zinc-900">Extra WhatsApp numbers</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Daily report goes to your main number from Settings plus these. E.164 format.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="+923001234567"
              value={whatsappRecipientPhone}
              onChange={(e) => setWhatsappRecipientPhone(e.target.value)}
              disabled={!user.dailyProgressWhatsApp}
            />
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              loading={whatsappRecipientSaving}
              disabled={!user.dailyProgressWhatsApp}
              onClick={() => void addWhatsappReportRecipient()}
            >
              Add
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {whatsappRecipientsLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-white/5 light:bg-zinc-200/40" />
            ) : whatsappRecipients.length === 0 ? (
              <li className="text-xs text-zinc-500">No extra numbers.</li>
            ) : (
              whatsappRecipients.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-black/20 px-3 py-2.5 light:border-zinc-200 light:bg-white"
                >
                  <span className="truncate text-sm text-zinc-300 light:text-zinc-900">{r.phone}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs text-red-300 hover:text-red-200"
                    loading={whatsappRecipientSaving}
                    disabled={!user.dailyProgressWhatsApp}
                    onClick={() => void removeWhatsappReportRecipient(r.phone)}
                  >
                    Remove
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
          <h2 className="text-sm font-semibold text-zinc-200 light:text-zinc-900">Extra email recipients</h2>
          <p className="mt-1 text-xs text-zinc-500">Others who receive the daily email digest.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="other@domain.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={!user.dailyProgressEmail}
            />
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              loading={recipientSaving}
              disabled={!user.dailyProgressEmail}
              onClick={() => void addRecipient()}
            >
              Add
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {recipientsLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-white/5 light:bg-zinc-200/40" />
            ) : recipients.length === 0 ? (
              <li className="text-xs text-zinc-500">No extra emails.</li>
            ) : (
              recipients.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-black/20 px-3 py-2.5 light:border-zinc-200 light:bg-white"
                >
                  <span className="truncate text-sm text-zinc-300 light:text-zinc-900">{r.email}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs text-red-300 hover:text-red-200"
                    loading={recipientSaving}
                    onClick={() => void removeRecipient(r.email)}
                  >
                    Remove
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-dashed border-zinc-700/80 bg-black/20 px-4 py-3 text-xs leading-relaxed text-zinc-500 light:border-zinc-300 light:bg-zinc-50">
        <p>
          Cron endpoint:{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-[11px] text-zinc-400 light:bg-white">
            /api/cron/progress-tracker/daily-report
          </code>{" "}
          with{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-[11px]">CRON_SECRET</code> (
          <code className="text-[11px]">x-cron-secret</code>, Bearer, or <code className="text-[11px]">?secret=</code>).
          See <code className="text-[11px]">vercel.json</code> and <code className="text-[11px]">npm run dev</code> (includes
          poller).
        </p>
      </section>
    </div>
  );
}
