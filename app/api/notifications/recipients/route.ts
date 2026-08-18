import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  email: z.string().email(),
});

const deleteSchema = z.object({
  email: z.string().email(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recipients = await prisma.notificationRecipient.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, createdAt: true },
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

  const email = parsed.data.email.toLowerCase();
  const created = await prisma.notificationRecipient.upsert({
    where: { userId_email: { userId: session.user.id, email } },
    update: {},
    create: { userId: session.user.id, email },
    select: { id: true, email: true, createdAt: true },
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
  const email = parsed.data.email.toLowerCase();
  await prisma.notificationRecipient.deleteMany({
    where: { userId: session.user.id, email },
  });
  return NextResponse.json({ ok: true });
}

