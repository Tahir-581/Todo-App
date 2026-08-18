import { DailyEmailReportKind } from "@prisma/client";
import { normalizeDailyReportSendMinutes, earliestDailyReportSendMinute } from "@/lib/dailyReportSchedule";
import { isEmailDeliveryConfigured, sendRawEmail } from "@/lib/email";
import {
  buildComposedDailyEmail,
  buildComposedDailyWhatsApp,
  fetchTasksForDailyEmail,
  skipReasonForDailyEmail,
  type UserRowForDailyEmail,
} from "@/lib/dailyEmailForUser";
import {
  buildProgressActivityReminderMessage,
  isActivityCheckedOnDate,
  isReminderWeekdayAllowed,
  parseProgressActivitiesForReminders,
  parseProgressChecksJson,
  resolveActivityReminderRecipientPhones,
} from "@/lib/progressActivityReminderWhatsApp";
import { prisma } from "@/lib/prisma";
import {
  calendarTodayYmd,
  getEffectiveReportTimeZone,
  localJsWeekdaySun0To6,
  localMinutesSinceMidnight,
  calendarYesterdayYmd,
} from "@/lib/reportTimeZone";
import { isWhatsAppBotConfigured, runWhatsAppSend } from "@/lib/whatsappBot";
import { dailyReportWhatsAppPhoneList } from "@/lib/whatsappReportPhones";
import { NextResponse } from "next/server";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set in environment");
    return false;
  }
  const header = req.headers.get("x-cron-secret")?.trim();
  if (header === secret) return true;
  const bearer = req.headers.get("authorization")?.trim();
  if (bearer === `Bearer ${secret}`) return true;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") === secret) return true;
  } catch {
    /* ignore */
  }
  console.warn("[cron] Unauthorized daily report trigger (bad or missing secret).");
  return false;
}


type CronUserRow = UserRowForDailyEmail & {
  emailNotifications: boolean;
  dailyProgressEmail: boolean;
  whatsappNotifications: boolean;
  dailyProgressWhatsApp: boolean;
  whatsappPhone: string | null;
  whatsappReportRecipients: { phone: string }[];
  hasProgressActivityWaReminders: boolean;
};

/**
 * Sends scheduled daily reports by email and/or WhatsApp (same report type & local send time).
 * Trigger from a scheduler with `x-cron-secret`, `Authorization: Bearer <CRON_SECRET>`, or `?secret=` query.
 * **GET** is supported so hosts that only issue GET cron requests (e.g. Vercel Cron) work.
 */
async function handleDailyReportCron(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailConfigured = isEmailDeliveryConfigured();
  const waConfigured = isWhatsAppBotConfigured();
  if (!emailConfigured && !waConfigured) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_delivery",
        hint: "Configure RESEND_API_KEY or SMTP_* for email, and add whatsapp_bot.py (or WHATSAPP_BOT_SCRIPT) for WhatsApp.",
      },
      { status: 500 }
    );
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { emailNotifications: true, dailyProgressEmail: true },
        {
          whatsappNotifications: true,
          dailyProgressWhatsApp: true,
          OR: [{ whatsappPhone: { not: null } }, { whatsappReportRecipients: { some: {} } }],
        },
        {
          hasProgressActivityWaReminders: true,
          whatsappNotifications: true,
          OR: [{ whatsappPhone: { not: null } }, { whatsappReportRecipients: { some: {} } }],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailNotifications: true,
      dailyProgressEmail: true,
      whatsappNotifications: true,
      dailyProgressWhatsApp: true,
      whatsappPhone: true,
      hasProgressActivityWaReminders: true,
      dailyEmailReportKind: true,
      dailyReportSendMinutes: true,
      reportTzOffsetMinutes: true,
      reportTimeZone: true,
      progressTrackerState: true,
      notificationRecipients: true,
      whatsappReportRecipients: { select: { phone: true } },
    },
  });

  let attemptedUsers = 0;
  let sentEmail = 0;
  let sentWhatsApp = 0;
  let sentActivityWhatsApp = 0;
  let skippedNoProgressState = 0;
  let skippedTooEarly = 0;
  let skippedAlreadySentEmail = 0;
  let skippedAlreadySentWhatsApp = 0;
  let skippedActivityReminder = 0;
  let skippedWhatsAppNoBot = 0;
  const errors: string[] = [];

  for (const raw of users) {
    const u = raw as CronUserRow;
    const timeZone = getEffectiveReportTimeZone(u);
    const localMinutes = localMinutesSinceMidnight(timeZone);
    const scheduleSlots = normalizeDailyReportSendMinutes(u.dailyReportSendMinutes);
    const reminderDefaultMins = earliestDailyReportSendMinute(scheduleSlots);

    const waPhones = dailyReportWhatsAppPhoneList(u.whatsappPhone, u.whatsappReportRecipients);
    const wouldWantWaDigest =
      u.whatsappNotifications && u.dailyProgressWhatsApp && waPhones.length > 0;
    if (wouldWantWaDigest && !waConfigured) {
      skippedWhatsAppNoBot += 1;
    }

    const wantsEmail = emailConfigured && u.emailNotifications && u.dailyProgressEmail;
    // Daily digest WhatsApp disabled (includes “today’s done” / task summary). Re-enable:
    // const wantsWa = waConfigured && u.whatsappNotifications && u.dailyProgressWhatsApp && waPhones.length > 0;
    const wantsWa = false;
    const wantsActivityWaReminders =
      waConfigured &&
      u.whatsappNotifications &&
      u.hasProgressActivityWaReminders &&
      waPhones.length > 0;

    if (!wantsEmail && !wantsWa && !wantsActivityWaReminders) continue;

    attemptedUsers += 1;

    const anyDigestSlotReady =
      scheduleSlots.length > 0 && scheduleSlots.some((m) => localMinutes >= m);
    if (!anyDigestSlotReady && (wantsEmail || wantsWa)) {
      skippedTooEarly += 1;
    }

    /** Email-only: skip empty progress-tracker report when state was never synced. WhatsApp/activity reminders still run. */
    const skipEmailNoProgressState = skipReasonForDailyEmail(u) === "no_progress_state";

    const reportDateStr = calendarYesterdayYmd(timeZone);
    /** Local calendar day for WhatsApp digest logs (per slot). */
    const whatsappDeliveryDayStr = calendarTodayYmd(timeZone);

    const needTasks =
      anyDigestSlotReady &&
      (wantsEmail || wantsWa) &&
      (u.dailyEmailReportKind === DailyEmailReportKind.ALL_TASKS ||
        u.dailyEmailReportKind === DailyEmailReportKind.ALL_REPORTS);
    const tasks = needTasks ? await fetchTasksForDailyEmail(u.id, u.dailyEmailReportKind) : [];

    if (wantsEmail && skipEmailNoProgressState && anyDigestSlotReady) {
      skippedNoProgressState += 1;
    }

    for (const slotMins of scheduleSlots) {
      const digestReady = localMinutes >= slotMins;
      if (!digestReady) continue;

      // --- Process Email (this schedule slot) ---
      if (wantsEmail) {
        if (skipEmailNoProgressState) {
          continue;
        } else {
          const existing = await prisma.progressDailyReportLog.findUnique({
            where: {
              userId_dateStr_slotMinutes: {
                userId: u.id,
                dateStr: reportDateStr,
                slotMinutes: slotMins,
              },
            },
            select: { id: true },
          });
          if (existing) {
            skippedAlreadySentEmail += 1;
          } else {
            try {
              const composed = buildComposedDailyEmail(u, tasks, { enforceScheduledTime: false });
              if (composed.kind !== "ok") {
                errors.push(`email:${u.id}:unexpected_early`);
              } else {
                const { html, subject } = composed;
                const recipients = [u.email, ...u.notificationRecipients.map((r) => r.email)].filter(Boolean);
                for (const to of recipients) {
                  await sendRawEmail({ to, subject, html });
                }
                await prisma.progressDailyReportLog.create({
                  data: { userId: u.id, dateStr: reportDateStr, slotMinutes: slotMins },
                });
                sentEmail += 1;
                console.log(
                  `[cron] Email sent to user ${u.id} for ${reportDateStr} slot=${slotMins}`
                );
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              console.error("[cron] Email failed for user", u.id, msg);
              errors.push(`email:${u.id}:${msg}`);
            }
          }
        }
      }

      // --- Process WhatsApp (daily digest, this slot) ---
      if (wantsWa) {
        const existingWa = await prisma.progressDailyReportWhatsAppLog.findUnique({
          where: {
            userId_dateStr_slotMinutes: {
              userId: u.id,
              dateStr: whatsappDeliveryDayStr,
              slotMinutes: slotMins,
            },
          },
          select: { id: true },
        });
        if (existingWa) {
          skippedAlreadySentWhatsApp += 1;
          console.log(
            `[cron] WA digest skipped (already sent this slot) user=${u.id} deliveryDay=${whatsappDeliveryDayStr} slot=${slotMins}`
          );
        } else {
          try {
            const composedWa = buildComposedDailyWhatsApp(u, tasks, { enforceScheduledTime: false });
            if (composedWa.kind !== "ok") {
              errors.push(`whatsapp:${u.id}:unexpected_early`);
            } else {
              const { text } = composedWa;
              console.log(
                `[cron] WhatsApp digest dispatch user=${u.id} slot=${slotMins} phones=${waPhones.length} messageChars=${text.length}`
              );
              for (const phone of waPhones) {
                const r = await runWhatsAppSend({ phone, message: text });
                if (!r.ok) {
                  throw new Error(r.stderr || `exit ${r.exitCode}`);
                }
              }
              await prisma.progressDailyReportWhatsAppLog.create({
                data: {
                  userId: u.id,
                  dateStr: whatsappDeliveryDayStr,
                  slotMinutes: slotMins,
                },
              });
              sentWhatsApp += 1;
              console.log(
                `[cron] WhatsApp sent to user ${u.id} deliveryDay=${whatsappDeliveryDayStr} slot=${slotMins} reportFor=${reportDateStr}`
              );
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[cron] WhatsApp failed for user", u.id, msg);
            errors.push(`whatsapp:${u.id}:${msg}`);
          }
        }
      }
    }

    // --- Per-activity WhatsApp reminders (each activity can use its own local send time) ---
    if (wantsActivityWaReminders && u.progressTrackerState) {
      const todayStr = calendarTodayYmd(timeZone);
      const localWeekday = localJsWeekdaySun0To6(timeZone);
      const activities = parseProgressActivitiesForReminders(
        u.progressTrackerState.activitiesJson,
        reminderDefaultMins
      );
      const reminderActs = activities.filter((a) => a.whatsappReminderEnabled);
      if (reminderActs.length === 0) {
        skippedActivityReminder += 1;
      } else {
        const checks = parseProgressChecksJson(u.progressTrackerState.checksJson);
        for (const act of reminderActs) {
          if (!isReminderWeekdayAllowed(localWeekday, act.reminderWeekdays)) {
            continue;
          }
          if (localMinutes < act.reminderSendMinutes) {
            continue;
          }
          if (isActivityCheckedOnDate(checks, todayStr, act.id)) {
            continue;
          }
          const actPhones = resolveActivityReminderRecipientPhones(act.reminderPhones, waPhones);
          if (actPhones.length === 0) {
            continue;
          }
          const existingRem = await prisma.progressActivityReminderWhatsAppLog.findUnique({
            where: {
              userId_activityId_dateStr: { userId: u.id, activityId: act.id, dateStr: todayStr },
            },
            select: { id: true },
          });
          if (existingRem) {
            continue;
          }
          try {
            const message = buildProgressActivityReminderMessage(act.name);
            console.log(
              `[cron] WhatsApp activity reminder dispatch user=${u.id} activity=${act.id} messageChars=${message.length}`
            );
            for (const phone of actPhones) {
              const r = await runWhatsAppSend({ phone, message });
              if (!r.ok) {
                throw new Error(r.stderr || `exit ${r.exitCode}`);
              }
            }
            await prisma.progressActivityReminderWhatsAppLog.create({
              data: { userId: u.id, activityId: act.id, dateStr: todayStr },
            });
            sentActivityWhatsApp += 1;
            console.log(`[cron] Activity WhatsApp reminder user ${u.id} activity ${act.id} ${todayStr}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[cron] Activity WhatsApp reminder failed for user", u.id, act.id, msg);
            errors.push(`whatsapp_activity:${u.id}:${act.id}:${msg}`);
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    attempted: attemptedUsers,
    sentEmail,
    sentWhatsApp,
    sentActivityWhatsApp,
    skippedNoProgressState,
    skippedTooEarly,
    skippedAlreadySentEmail,
    skippedAlreadySentWhatsApp,
    skippedActivityReminder,
    skippedWhatsAppNoBot,
    whatsappBotConfigured: waConfigured,
    emailConfigured,
    ...(errors.length ? { errors } : {}),
  });
}

export async function GET(req: Request) {
  return handleDailyReportCron(req);
}

export async function POST(req: Request) {
  return handleDailyReportCron(req);
}
