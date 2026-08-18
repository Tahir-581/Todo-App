import { getSession } from "@/lib/auth";
import { anyActivityHasWhatsAppReminder } from "@/lib/progressActivityReminderWhatsApp";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const activitySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  createdAt: z.string().min(1).max(64),
  whatsappReminderEnabled: z.boolean().optional(),
  whatsappReminderAtMinutes: z.number().int().min(0).max(1439).nullable().optional(),
  whatsappReminderWeekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  whatsappReminderPhones: z.array(z.string().regex(/^\+[1-9]\d{6,14}$/)).max(12).optional(),
});

const bodySchema = z.object({
  activities: z.array(activitySchema).max(50),
  checks: z.record(z.literal(true)),
  tzOffsetMinutes: z.number().int().min(-14 * 60).max(14 * 60),
  timeZone: z.string().min(1).max(120).optional(),
});

/** Stores the local progress tracker state server-side for daily email reports. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { activities, checks, tzOffsetMinutes, timeZone } = parsed.data;
  const activitiesJson = JSON.stringify(activities);
  const hasWaRem = anyActivityHasWhatsAppReminder(activitiesJson);

  await prisma.userProgressTrackerState.upsert({
    where: { userId: session.user.id },
    update: {
      activitiesJson,
      checksJson: JSON.stringify(checks),
      tzOffsetMinutes,
    },
    create: {
      userId: session.user.id,
      activitiesJson,
      checksJson: JSON.stringify(checks),
      tzOffsetMinutes,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      reportTzOffsetMinutes: tzOffsetMinutes,
      hasProgressActivityWaReminders: hasWaRem,
      ...(timeZone ? { reportTimeZone: timeZone } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

