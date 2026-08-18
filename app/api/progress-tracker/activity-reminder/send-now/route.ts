import { earliestDailyReportSendMinute, normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";
import { getSession } from "@/lib/auth";
import {
  buildProgressActivityReminderMessage,
  parseProgressActivitiesForReminders,
  resolveActivityReminderRecipientPhones,
} from "@/lib/progressActivityReminderWhatsApp";
import { prisma } from "@/lib/prisma";
import { isWhatsAppBotConfigured, runWhatsAppSend } from "@/lib/whatsappBot";
import { dailyReportWhatsAppPhoneList } from "@/lib/whatsappReportPhones";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  activityId: z.string().min(1).max(64).optional(),
});

/**
 * Sends one activity reminder immediately (does not write ProgressActivityReminderWhatsAppLog).
 * Use to verify WhatsApp bot + numbers without waiting for cron.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppBotConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "whatsapp_bot_missing",
        hint: "Add whatsapp_bot.py to the project root or set WHATSAPP_BOT_SCRIPT.",
      },
      { status: 500 }
    );
  }

  let activityId: string | undefined;
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (parsed.success) activityId = parsed.data.activityId;
  } catch {
    /* optional body */
  }

  const raw = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      whatsappNotifications: true,
      whatsappPhone: true,
      dailyReportSendMinutes: true,
      whatsappReportRecipients: { select: { phone: true } },
      progressTrackerState: true,
    },
  });

  if (!raw?.whatsappNotifications) {
    return NextResponse.json(
      { error: "Turn on WhatsApp notifications in Settings.", hint: "settings_whatsapp" },
      { status: 400 }
    );
  }

  const globalPhones = dailyReportWhatsAppPhoneList(raw.whatsappPhone, raw.whatsappReportRecipients);
  if (globalPhones.length === 0) {
    return NextResponse.json(
      {
        error: "Add at least one WhatsApp number in Settings (E.164, e.g. +14155552671).",
        hint: "settings_phone",
      },
      { status: 400 }
    );
  }

  if (!raw.progressTrackerState) {
    return NextResponse.json(
      {
        error: "No synced progress data yet.",
        hint: "Stay on this page a moment after changing reminders so sync finishes, then try again.",
      },
      { status: 400 }
    );
  }

  const defaultReminderMins = earliestDailyReportSendMinute(
    normalizeDailyReportSendMinutes(raw.dailyReportSendMinutes)
  );
  const activities = parseProgressActivitiesForReminders(
    raw.progressTrackerState.activitiesJson,
    defaultReminderMins
  );
  const enabled = activities.filter((a) => a.whatsappReminderEnabled);
  if (enabled.length === 0) {
    return NextResponse.json(
      { error: 'Enable "WhatsApp reminder" on at least one activity.', hint: "enable_reminder" },
      { status: 400 }
    );
  }

  const target =
    activityId != null ? enabled.find((a) => a.id === activityId) : enabled[0];
  if (!target) {
    return NextResponse.json(
      { error: "No matching activity with WhatsApp reminder enabled.", hint: "bad_activity_id" },
      { status: 400 }
    );
  }

  const phones = resolveActivityReminderRecipientPhones(target.reminderPhones, globalPhones);
  if (phones.length === 0) {
    return NextResponse.json(
      {
        error: "No WhatsApp recipients for this activity (check Settings numbers and per-activity selection).",
        hint: "settings_phone",
      },
      { status: 400 }
    );
  }

  const message = buildProgressActivityReminderMessage(target.name);

  try {
    for (const phone of phones) {
      const r = await runWhatsAppSend({ phone, message });
      if (!r.ok) {
        throw new Error(r.stderr || `WhatsApp bot exited with code ${r.exitCode}`);
      }
    }
    return NextResponse.json({
      ok: true,
      activityId: target.id,
      activityName: target.name,
      recipientCount: phones.length,
      note: "Test send only; scheduled reminders still require cron hitting /api/cron/progress-tracker/daily-report.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[activity-reminder/send-now]", msg);
    return NextResponse.json(
      {
        error: "WhatsApp send failed",
        ...(process.env.NODE_ENV === "development" ? { detail: msg } : {}),
      },
      { status: 500 }
    );
  }
}
