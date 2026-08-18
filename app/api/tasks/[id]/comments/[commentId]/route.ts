import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string; commentId: string } };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const comment = await prisma.comment.findFirst({
    where: { id: ctx.params.commentId, taskId: ctx.params.id },
    include: { task: true },
  });
  if (!comment || comment.task.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.comment.delete({ where: { id: comment.id } });
  await logTaskActivity(
    comment.taskId,
    session.user.id,
    "comment_deleted",
    null,
    comment.content.slice(0, 120)
  );
  return NextResponse.json({ ok: true });
}
