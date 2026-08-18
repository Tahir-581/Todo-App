import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subtaskSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

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
  const parsed = subtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const maxOrder = await prisma.subtask.aggregate({
    where: { taskId: task.id },
    _max: { order: true },
  });
  const order = parsed.data.order ?? (maxOrder._max.order ?? -1) + 1;
  const sub = await prisma.subtask.create({
    data: {
      title: parsed.data.title,
      taskId: task.id,
      order,
    },
  });
  await logTaskActivity(task.id, session.user.id, "subtask_added", null, sub.title);
  return NextResponse.json(sub);
}
