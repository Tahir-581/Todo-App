import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = ctx.params;
  const owned = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const parsed = projectSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = ctx.params;
  const owned = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const inbox = await prisma.project.findFirst({
    where: { userId: session.user.id, name: "Inbox" },
  });
  if (inbox && id !== inbox.id) {
    await prisma.task.updateMany({
      where: { projectId: id },
      data: { projectId: inbox.id },
    });
  }
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
