"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DailyDigestSchedulePanel } from "@/components/whatsapp/DailyDigestSchedulePanel";
import { ArrowLeft, MessageCircle } from "lucide-react";

export default function WhatsAppSchedulePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-6xl space-y-8 pb-16"
    >
      <div className="flex flex-col gap-4 border-b border-zinc-800/60 pb-8 light:border-zinc-200 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/settings"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300 light:hover:text-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Settings
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 ring-1 ring-emerald-500/20">
              <MessageCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 light:text-zinc-900 sm:text-3xl">
                WhatsApp &amp; daily reports
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                Choose when your digest runs, which channels to use, and who else receives it — similar to a dedicated
                scheduler, but powered by your app&apos;s cron and Selenium bot.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DailyDigestSchedulePanel />
    </motion.div>
  );
}
