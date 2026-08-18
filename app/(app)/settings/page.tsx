"use client";

import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useUiStore } from "@/store/uiStore";

const profileSchema = z.object({ name: z.string().min(1).max(120) });
const passSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirm, { message: "Must match", path: ["confirm"] });

type SettingsUser = {
  name: string | null;
  email: string;
  avatar: string | null;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  whatsappPhone: string | null;
  reportTimeZone: string | null;
  theme: string;
};

function toSettingsUser(raw: unknown): SettingsUser {
  const u = raw as Record<string, unknown>;
  return {
    name: (u.name as string | null) ?? null,
    email: String(u.email ?? ""),
    avatar: (u.avatar as string | null) ?? null,
    emailNotifications: Boolean(u.emailNotifications),
    whatsappNotifications: Boolean(u.whatsappNotifications),
    whatsappPhone: (u.whatsappPhone as string | null) ?? null,
    reportTimeZone: (u.reportTimeZone as string | null) ?? null,
    theme: typeof u.theme === "string" ? u.theme : "dark",
  };
}

export default function SettingsPage() {
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [emailDiag, setEmailDiag] = useState<unknown>(null);
  const [emailDiagLoading, setEmailDiagLoading] = useState(false);
  const [whatsappTestLoading, setWhatsappTestLoading] = useState(false);
  const [whatsappPhoneDraft, setWhatsappPhoneDraft] = useState("");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });
  const passForm = useForm<z.infer<typeof passSchema>>({
    resolver: zodResolver(passSchema),
  });

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        setUser(toSettingsUser(u));
        setWhatsappPhoneDraft(u.whatsappPhone ?? "");
        profileForm.reset({ name: u.name || "" });
        void fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportTzOffsetMinutes: new Date().getTimezoneOffset(),
            reportTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  async function saveProfile(data: z.infer<typeof profileSchema>) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name }),
    });
    if (res.ok) setUser(toSettingsUser(await res.json()));
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result || "");
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      if (res.ok) setUser(toSettingsUser(await res.json()));
    };
    reader.readAsDataURL(file);
  }

  async function toggleEmail(on: boolean) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: on }),
    });
    if (res.ok) setUser(toSettingsUser(await res.json()));
  }

  async function toggleWhatsApp(on: boolean) {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappNotifications: on }),
    });
    if (res.ok) setUser(toSettingsUser(await res.json()));
  }

  async function saveWhatsAppPhone() {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsappPhone: whatsappPhoneDraft.trim() === "" ? null : whatsappPhoneDraft.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const next = toSettingsUser(data);
      setUser(next);
      setWhatsappPhoneDraft(next.whatsappPhone ?? "");
      showToast({ title: "WhatsApp number(s) saved" });
    } else {
      const err = data?.error?.fieldErrors?.whatsappPhone?.[0] as string | undefined;
      showToast({
        title: "Could not save number(s)",
        body: err || "Use E.164 format (+country code). For multiple numbers, separate with commas.",
      });
    }
  }

  async function testWhatsApp() {
    setWhatsappTestLoading(true);
    try {
      const res = await fetch("/api/notifications/whatsapp", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        detail?: string;
      };
      if (res.ok && data.ok) {
        showToast({
          title: "Test WhatsApp sent",
          body: "If Chrome opened, ensure you are logged into WhatsApp Web and watch for the message.",
        });
      } else {
        const extra = data.hint ? ` ${data.hint}` : data.detail ? ` ${data.detail}` : "";
        showToast({
          title: "WhatsApp test failed",
          body: (data.error || "Check server logs and .env.") + extra,
        });
      }
    } finally {
      setWhatsappTestLoading(false);
    }
  }

  async function setTheme(t: "dark" | "light") {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    });
    if (res.ok) {
      setUser(toSettingsUser(await res.json()));
      document.documentElement.classList.toggle("light", t === "light");
      document.documentElement.classList.toggle("dark", t === "dark");
    }
  }

  async function testEmail() {
    const res = await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TEST" }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      previewUrl?: string | null;
      provider?: "smtp" | "resend";
      hint?: string;
      error?: string;
      detail?: string;
    };
    if (res.ok) {
      showToast({
        title: "Test email requested",
        body:
          data.hint ||
          (data.provider === "resend"
            ? "Sent via Resend. Check your inbox and spam folder."
            : data.previewUrl
              ? "Ethereal preview is available. Open it to view the message."
              : "Request succeeded. Check your inbox and spam folder."),
        actions: data.previewUrl ? (
          <Button
            variant="outline"
            className="px-2 py-1 text-xs"
            onClick={() => {
              window.open(data.previewUrl as string, "_blank", "noopener,noreferrer");
            }}
          >
            Open preview
          </Button>
        ) : null,
      });
    } else {
      const detail = data.detail ? ` ${data.detail}` : "";
      showToast({
        title: "Email failed",
        body: (data.error || "Check SMTP credentials/network and server logs.") + detail,
      });
    }
  }

  async function loadEmailDiagnostics() {
    const res = await fetch("/api/notifications/email/diagnostics");
    const data = await res.json().catch(() => null);
    return data;
  }

  async function changePassword(data: z.infer<typeof passSchema>) {
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });
    if (res.ok) passForm.reset();
  }

  async function deleteAccount(password: string) {
    setDeleteAccountLoading(true);
    setDeleteAccountError(null);
    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else {
        const err = data?.error;
        setDeleteAccountError(
          typeof err === "string" ? err : "Could not delete account. Check your password."
        );
      }
    } finally {
      setDeleteAccountLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800/40" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-xl space-y-10">
      <PromptDialog
        open={deleteAccountOpen}
        onClose={() => {
          setDeleteAccountOpen(false);
          setDeleteAccountError(null);
        }}
        title="Delete your account?"
        message="This permanently removes all projects, tasks, and data linked to your account. This cannot be undone."
        label="Current password"
        inputType="password"
        placeholder="Enter your password"
        submitLabel="Delete account"
        cancelLabel="Cancel"
        destructive
        loading={deleteAccountLoading}
        error={deleteAccountError}
        onSubmit={deleteAccount}
      />
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
      </div>

      <section className="rounded-xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
        <h2 className="text-sm font-medium text-zinc-300 light:text-zinc-900">Profile</h2>
        <form className="mt-4 space-y-4" onSubmit={profileForm.handleSubmit(saveProfile)}>
          <div>
            <label className="text-xs text-zinc-500">Name</label>
            <Input className="mt-1" {...profileForm.register("name")} />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Avatar</label>
            <input type="file" accept="image/*" className="mt-2 block w-full text-xs text-zinc-400" onChange={onAvatar} />
          </div>
          <Button type="submit" variant="primary">
            Save profile
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
        <h2 className="text-sm font-medium text-zinc-300 light:text-zinc-900">Notifications</h2>
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={user.emailNotifications}
            onChange={(e) => toggleEmail(e.target.checked)}
          />
          Email notifications
        </label>

        <div className="mt-4 space-y-3 rounded-lg border border-zinc-800/60 bg-black/20 p-4 light:border-zinc-200 light:bg-zinc-50/60">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={user.whatsappNotifications}
              onChange={(e) => toggleWhatsApp(e.target.checked)}
            />
            WhatsApp on task completion
          </label>
          <p className="text-xs text-zinc-500">
            Uses the Selenium bot on the machine running this app. The repo includes{" "}
            <code className="text-zinc-400">whatsapp_bot.py</code> at the project root; optional{" "}
            <code className="text-zinc-400">WHATSAPP_BOT_SCRIPT</code> / <code className="text-zinc-400">WHATSAPP_BOT_CWD</code>{" "}
            in <code className="text-zinc-400">.env</code> override that. First image attachment is sent after the text when
            possible.
          </p>
          <div>
            <label className="text-xs text-zinc-500">WhatsApp number(s) (E.164, comma-separated)</label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="+923001234567, +923009876543"
                value={whatsappPhoneDraft}
                onChange={(e) => setWhatsappPhoneDraft(e.target.value)}
                disabled={!user.whatsappNotifications}
              />
              <Button
                type="button"
                variant="outline"
                className="sm:w-auto"
                disabled={!user.whatsappNotifications}
                onClick={() => void saveWhatsAppPhone()}
              >
                Save number(s)
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="text-xs"
            loading={whatsappTestLoading}
            disabled={!user.whatsappNotifications || !user.whatsappPhone}
            onClick={() => void testWhatsApp()}
          >
            Send test WhatsApp
          </Button>
        </div>

        <Link
          href="/whatsapp-schedule"
          className="group mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-teal-600/[0.04] p-4 transition-colors hover:border-emerald-500/40 light:border-emerald-600/20 light:from-emerald-50/80 light:to-white"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 light:text-zinc-900">Daily digest &amp; WhatsApp reports</p>
            <p className="mt-1 text-xs text-zinc-500">
              Send time, report type, extra recipients, and test sends — configured on a dedicated page.
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-emerald-400/90 group-hover:bg-white/10">
            Open
          </span>
        </Link>

        <Button variant="outline" className="mt-4" type="button" onClick={() => void testEmail()}>
          Send test email
        </Button>
        <p className="mt-3 text-xs text-zinc-500">
          If the terminal shows <code className="text-zinc-400">ETIMEDOUT</code> on port 587, your network blocks SMTP. Set{" "}
          <code className="text-zinc-400">RESEND_API_KEY</code> in <code className="text-zinc-400">.env</code> (
          <a href="https://resend.com" className="text-accent hover:underline" target="_blank" rel="noreferrer">
            resend.com
          </a>
          ) — email then goes over HTTPS. With <strong className="text-zinc-400">Ethereal</strong> only, use the preview URL;
          nothing is delivered to a real inbox.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          type="button"
          loading={emailDiagLoading}
          onClick={() => {
            setEmailDiagLoading(true);
            void loadEmailDiagnostics()
              .then(setEmailDiag)
              .finally(() => setEmailDiagLoading(false));
          }}
        >
          Run email diagnostics
        </Button>
        {emailDiag ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-[11px] text-zinc-400 light:border-zinc-200 light:bg-zinc-100 light:text-zinc-700">
            {JSON.stringify(emailDiag, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
        <h2 className="text-sm font-medium text-zinc-300 light:text-zinc-900">Appearance</h2>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant={user.theme === "dark" ? "primary" : "outline"} onClick={() => setTheme("dark")}>
            Dark
          </Button>
          <Button type="button" variant={user.theme === "light" ? "primary" : "outline"} onClick={() => setTheme("light")}>
            Light
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-surface/50 p-6 light:border-zinc-200 light:bg-white">
        <h2 className="text-sm font-medium text-zinc-300 light:text-zinc-900">Change password</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={passForm.handleSubmit((d) => void changePassword(d))}
        >
          <Input type="password" placeholder="Current" {...passForm.register("currentPassword")} />
          <Input type="password" placeholder="New" {...passForm.register("newPassword")} />
          <Input type="password" placeholder="Confirm" {...passForm.register("confirm")} />
          <Button type="submit">Update password</Button>
        </form>
      </section>

      <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h2 className="text-sm font-medium text-red-300">Delete account</h2>
        <p className="mt-2 text-xs text-zinc-500">This removes all projects and tasks. Irreversible.</p>
        <Button
          variant="danger"
          className="mt-4"
          type="button"
          onClick={() => setDeleteAccountOpen(true)}
        >
          Delete my account
        </Button>
      </section>
    </motion.div>
  );
}
