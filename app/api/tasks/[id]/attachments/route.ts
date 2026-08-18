import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().min(1).max(500_000),
});

type Ctx = { params: { id: string } };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const task = await prisma.task.findFirst({
    where: { id: ctx.params.id, userId: session.user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const att = await prisma.attachment.create({
    data: {
      name: parsed.data.name,
      url: parsed.data.url,
      taskId: task.id,
    },
  });
  await logTaskActivity(task.id, session.user.id, "attachment_added", null, att.name);
  return NextResponse.json(att);
}
