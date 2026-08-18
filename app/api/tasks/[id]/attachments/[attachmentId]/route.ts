import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string; attachmentId: string } };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const att = await prisma.attachment.findFirst({
    where: { id: ctx.params.attachmentId, taskId: ctx.params.id },
    include: { task: true },
  });
  if (!att || att.task.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.attachment.delete({ where: { id: att.id } });
  await logTaskActivity(att.taskId, session.user.id, "attachment_removed", att.name, null);
  return NextResponse.json({ ok: true });
}
