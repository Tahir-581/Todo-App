import { getSession } from "@/lib/auth";

import { NextResponse } from "next/server";



/**

 * Sends the configured daily report as a WhatsApp message immediately (same content shape as the scheduled job).

 * WhatsApp send is disabled; implementation kept below for re-enable.

 */

export async function POST() {

  const session = await getSession();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  return NextResponse.json(

    {

      ok: false,

      error: "whatsapp_daily_digest_disabled",

      hint: "Sending the daily progress report via WhatsApp is turned off. Email digests are unchanged if configured.",

    },

    { status: 503 }

  );

}



/*

import { DailyEmailReportKind } from "@prisma/client";

import {

  buildComposedDailyWhatsApp,

  fetchTasksForDailyEmail,

  skipReasonForDailyEmail,

  type UserRowForDailyEmail,

} from "@/lib/dailyEmailForUser";

import { prisma } from "@/lib/prisma";

import { isWhatsAppBotConfigured, runWhatsAppSend } from "@/lib/whatsappBot";

import { normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";

import { dailyReportWhatsAppPhoneList } from "@/lib/whatsappReportPhones";



async function postSendDailyWhatsAppDisabledBody() {

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



  const session = await getSession();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const raw = await prisma.user.findUnique({

    where: { id: session.user.id },

    select: {

      whatsappNotifications: true,

      dailyProgressWhatsApp: true,

      whatsappPhone: true,

      whatsappReportRecipients: { select: { phone: true } },

      dailyEmailReportKind: true,

      dailyReportSendMinutes: true,

      reportTzOffsetMinutes: true,

      reportTimeZone: true,

      progressTrackerState: true,

    },

  });



  if (!raw?.whatsappNotifications || !raw.dailyProgressWhatsApp) {

    return NextResponse.json(

      { error: "Enable WhatsApp notifications and the daily WhatsApp report in Settings." },

      { status: 400 }

    );

  }

  const phones = dailyReportWhatsAppPhoneList(raw.whatsappPhone, raw.whatsappReportRecipients);

  if (phones.length === 0) {

    return NextResponse.json(

      {

        error: "Add at least one WhatsApp number for the report.",

        hint: "Save your main number above or add numbers under “Also send WhatsApp report to”.",

      },

      { status: 400 }

    );

  }



  const u = {

    id: session.user.id,

    email: "",

    notificationRecipients: [],

    dailyEmailReportKind: raw.dailyEmailReportKind,

    dailyReportSendMinutes: normalizeDailyReportSendMinutes(raw.dailyReportSendMinutes),

    reportTzOffsetMinutes: raw.reportTzOffsetMinutes,

    reportTimeZone: raw.reportTimeZone,

    progressTrackerState: raw.progressTrackerState,

  } as UserRowForDailyEmail;



  if (skipReasonForDailyEmail(u) === "no_progress_state") {

    return NextResponse.json(

      {

        error: "No synced tracker data",

        hint: "Open the Progress Tracker page once so your habits sync to the server.",

      },

      { status: 400 }

    );

  }



  const needTasks =

    u.dailyEmailReportKind === DailyEmailReportKind.ALL_TASKS ||

    u.dailyEmailReportKind === DailyEmailReportKind.ALL_REPORTS;

  const tasks = needTasks ? await fetchTasksForDailyEmail(u.id, u.dailyEmailReportKind) : [];



  const built = buildComposedDailyWhatsApp(u, tasks, { enforceScheduledTime: false });

  if (built.kind !== "ok") {

    return NextResponse.json({ error: "Could not build report" }, { status: 500 });

  }



  const { text, subjectLine, reportDateStr, asOfFormatted, timeZone } = built;



  try {

    for (const phone of phones) {

      const r = await runWhatsAppSend({ phone, message: text });

      if (!r.ok) {

        throw new Error(r.stderr || `WhatsApp bot exited with code ${r.exitCode}`);

      }

    }

    return NextResponse.json({

      ok: true,

      reportDateStr,

      subjectLine,

      asOf: asOfFormatted,

      timeZone,

      recipientCount: phones.length,

    });

  } catch (e) {

    const msg = e instanceof Error ? e.message : String(e);

    console.error("[progress-tracker/report/send-now/whatsapp]", msg);

    return NextResponse.json(

      {

        error: "WhatsApp send failed",

        ...(process.env.NODE_ENV === "development" ? { detail: msg } : {}),

      },

      { status: 500 }

    );

  }

}

*/

