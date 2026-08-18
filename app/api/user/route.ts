import { DailyEmailReportKind } from "@prisma/client";
import { normalizeDailyReportSendMinutes } from "@/lib/dailyReportSchedule";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWhatsAppPhoneList } from "@/lib/whatsappReportPhones";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatar: z.string().max(500_000).nullable().optional(),
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  whatsappPhone: z.string().max(500).nullable().optional(),
  dailyProgressEmail: z.boolean().optional(),
  dailyProgressWhatsApp: z.boolean().optional(),
  dailyReportSendMinutes: z.array(z.number().int().min(0).max(1439)).min(1).max(48).optional(),
  dailyEmailReportKind: z.nativeEnum(DailyEmailReportKind).optional(),
  reportTzOffsetMinutes: z.number().int().min(-14 * 60).max(14 * 60).optional(),
  reportTimeZone: z.string().min(1).max(120).nullable().optional(),
  theme: z.enum(["dark", "light"]).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      emailNotifications: true,
      whatsappNotifications: true,
      whatsappPhone: true,
      dailyProgressEmail: true,
      dailyProgressWhatsApp: true,
      dailyReportSendMinutes: true,
      dailyEmailReportKind: true,
      reportTzOffsetMinutes: true,
      reportTimeZone: true,
      theme: true,
      createdAt: true,
    },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = { ...parsed.data };
  if (data.dailyReportSendMinutes !== undefined) {
    data.dailyReportSendMinutes = normalizeDailyReportSendMinutes(data.dailyReportSendMinutes);
  }
  if (data.whatsappPhone !== undefined) {
    const t = data.whatsappPhone?.trim() ?? "";
    if (!t) {
      data.whatsappPhone = null;
    } else {
      const { phones, invalid } = parseWhatsAppPhoneList(t);
      if (invalid.length > 0 || phones.length === 0) {
        return NextResponse.json(
          {
            error: {
              formErrors: [],
              fieldErrors: {
                whatsappPhone: [
                  "Use international format with country code, comma-separated if multiple, e.g. +923001234567, +923009876543",
                ],
              },
            },
          },
          { status: 400 }
        );
      }
      data.whatsappPhone = phones.join(", ");
    }
  }
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      emailNotifications: true,
      whatsappNotifications: true,
      whatsappPhone: true,
      dailyProgressEmail: true,
      dailyProgressWhatsApp: true,
      dailyReportSendMinutes: true,
      dailyEmailReportKind: true,
      reportTzOffsetMinutes: true,
      reportTimeZone: true,
      theme: true,
    },
  });
  return NextResponse.json(user);
}
