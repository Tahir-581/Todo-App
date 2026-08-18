import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validators";
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
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      taskId: task.id,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });
  await logTaskActivity(task.id, session.user.id, "comment", null, parsed.data.content.slice(0, 120));
  return NextResponse.json(comment);
}
