import { getSession } from "@/lib/auth";
import { appendIdeaActivity } from "@/lib/ideas/ideaActivity";
import { ideaRowToDto, toPrismaStatus } from "@/lib/ideas/prismaMaps";
import { prisma } from "@/lib/prisma";
import { ideaCreateSchema, ideaStatusApiSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import type { PrismaIdeaStatusDb } from "@/lib/ideas/prismaMaps";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const statusParam = searchParams.get("status");
  const tagsParam = searchParams.get("tags");
  const sort = searchParams.get("sort") || "newest";

  const where: Prisma.IdeaWhereInput = { userId: session.user.id };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (statusParam) {
    const parts = statusParam.split(",").filter(Boolean);
    const mapped: PrismaIdeaStatusDb[] = [];
    for (const p of parts) {
      const z = ideaStatusApiSchema.safeParse(p);
      if (z.success) mapped.push(toPrismaStatus(z.data));
    }
    if (mapped.length) where.status = { in: mapped };
  }

  if (tagsParam) {
    const tagList = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagList.length) {
      where.tags = { hasSome: tagList };
    }
  }

  let orderBy: Prisma.IdeaOrderByWithRelationInput | Prisma.IdeaOrderByWithRelationInput[] = {
    createdAt: "desc",
  };
  if (sort === "votes") {
    orderBy = [{ votes: "desc" as const }, { createdAt: "desc" as const }];
  }

  const rows = await prisma.idea.findMany({
    where,
    orderBy,
  });

  return NextResponse.json(rows.map(ideaRowToDto));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ideaCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, description, tags, status: statusApi } = parsed.data;
    const status: PrismaIdeaStatusDb = statusApi ? toPrismaStatus(statusApi) : "PARKED";

    const maxOrder = await prisma.idea.aggregate({
      where: { userId: session.user.id, status },
      _max: { columnOrder: true },
    });
    const columnOrder = (maxOrder._max.columnOrder ?? -1) + 1;

    const idea = await prisma.idea.create({
      data: {
        title: title.trim(),
        description: description ?? "",
        tags: [...new Set(tags.map((t) => t.trim()).filter(Boolean))],
        status,
        userId: session.user.id,
        columnOrder,
      },
    });

    await appendIdeaActivity(idea.id, "created", idea.title);

    return NextResponse.json(ideaRowToDto(idea));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
  }
}
