import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subtask.findFirst({
    where: { id: ctx.params.id },
    include: { task: true },
  });
  if (!sub || sub.task.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await prisma.subtask.update({
    where: { id: sub.id },
    data: parsed.data,
  });
  if (parsed.data.completed !== undefined) {
    await logTaskActivity(
      sub.taskId,
      session.user.id,
      "subtask_toggled",
      sub.title,
      String(parsed.data.completed)
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sub = await prisma.subtask.findFirst({
    where: { id: ctx.params.id },
    include: { task: true },
  });
  if (!sub || sub.task.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.subtask.delete({ where: { id: sub.id } });
  await logTaskActivity(sub.taskId, session.user.id, "subtask_removed", sub.title, null);
  return NextResponse.json({ ok: true });
}
