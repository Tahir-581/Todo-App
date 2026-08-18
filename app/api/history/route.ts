import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("limit") || 100), 200);
  const activities = await prisma.taskActivity.findMany({
    where: {
      userId: session.user.id,
      task: { userId: session.user.id },
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      task: { select: { id: true, title: true, taskRef: true } },
      user: { select: { id: true, name: true, avatar: true } },
    },
  });
  return NextResponse.json(activities);
}
