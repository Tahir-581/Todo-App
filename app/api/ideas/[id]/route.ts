import { getSession } from "@/lib/auth";
import { appendIdeaActivity } from "@/lib/ideas/ideaActivity";
import { ideaRowToDto, toApiStatus, toPrismaStatus } from "@/lib/ideas/prismaMaps";
import { prisma } from "@/lib/prisma";
import { ideaUpdateSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.idea.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ideaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, tags, status, columnOrder, voteDelta } = parsed.data;

  if (
    title === undefined &&
    description === undefined &&
    tags === undefined &&
    status === undefined &&
    columnOrder === undefined &&
    voteDelta === undefined
  ) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const data: Prisma.IdeaUpdateInput = {};

  if (title !== undefined) {
    if (title.trim() !== existing.title) {
      data.title = title.trim();
      await appendIdeaActivity(id, "title_updated", `${existing.title} → ${title.trim()}`);
    }
  }

  if (description !== undefined && description !== existing.description) {
    data.description = description;
    await appendIdeaActivity(id, "description_updated", null);
  }

  if (tags !== undefined) {
    const nextTags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    const same =
      nextTags.length === existing.tags.length && nextTags.every((t) => existing.tags.includes(t));
    if (!same) {
      data.tags = nextTags;
      await appendIdeaActivity(id, "tags_updated", nextTags.join(", ") || "(cleared)");
    }
  }

  if (status !== undefined) {
    const next = toPrismaStatus(status);
    if (next !== existing.status) {
      data.status = next;
      await appendIdeaActivity(
        id,
        "status_changed",
        `${toApiStatus(existing.status)} → ${status}`
      );
      if (columnOrder === undefined) {
        const maxOrder = await prisma.idea.aggregate({
          where: { userId: session.user.id, status: next },
          _max: { columnOrder: true },
        });
        data.columnOrder = (maxOrder._max.columnOrder ?? -1) + 1;
      }
    }
  }

  if (columnOrder !== undefined) {
    data.columnOrder = columnOrder;
  }

  if (voteDelta !== undefined) {
    const nextVotes = Math.max(0, existing.votes + voteDelta);
    if (nextVotes !== existing.votes) {
      data.votes = nextVotes;
      await appendIdeaActivity(id, "vote", voteDelta > 0 ? "+1" : "-1");
    }
  }

  const idea =
    Object.keys(data).length > 0
      ? await prisma.idea.update({
          where: { id, userId: session.user.id },
          data,
        })
      : existing;

  return NextResponse.json(ideaRowToDto(idea));
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.idea.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.idea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
