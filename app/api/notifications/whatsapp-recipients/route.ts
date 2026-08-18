import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateWhatsAppE164 } from "@/lib/whatsappReportPhones";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  phone: z.string().min(1).max(24),
});

const deleteSchema = z.object({
  phone: z.string().min(1).max(24),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recipients = await prisma.whatsAppReportRecipient.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, phone: true, createdAt: true },
  });
  return NextResponse.json({ recipients });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalized = validateWhatsAppE164(parsed.data.phone);
  if (!normalized) {
    return NextResponse.json(
      {
        error: {
          formErrors: [],
          fieldErrors: {
            phone: ["Use international format with country code, e.g. +923001234567"],
          },
        },
      },
      { status: 400 }
    );
  }

  const created = await prisma.whatsAppReportRecipient.upsert({
    where: { userId_phone: { userId: session.user.id, phone: normalized } },
    update: {},
    create: { userId: session.user.id, phone: normalized },
    select: { id: true, phone: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, recipient: created });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const normalized = validateWhatsAppE164(parsed.data.phone);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }
  await prisma.whatsAppReportRecipient.deleteMany({
    where: { userId: session.user.id, phone: normalized },
  });
  return NextResponse.json({ ok: true });
}
