import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const label = await prisma.label.findFirst({
    where: { id: ctx.params.id, userId: session.user.id },
  });
  if (!label) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.label.delete({ where: { id: label.id } });
  return NextResponse.json({ ok: true });
}
