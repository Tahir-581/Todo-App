import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { IdeaActivityDto } from "@/lib/ideas/types";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ideaId } = await ctx.params;

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId: session.user.id },
    select: { id: true },
  });
  if (!idea) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.ideaActivity.findMany({
    where: { ideaId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const dto: IdeaActivityDto[] = rows.map((r) => ({
    id: r.id,
    ideaId: r.ideaId,
    action: r.action,
    detail: r.detail,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json(dto);
}
