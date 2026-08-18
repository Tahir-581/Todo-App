import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskCreateSchema } from "@/lib/validators";
import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const taskListInclude = {
  project: true,
  labels: { include: { label: true } },
  subtasks: { orderBy: { order: "asc" as const } },
  _count: { select: { subtasks: true, comments: true } },
} satisfies Prisma.TaskInclude;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const labelIds = searchParams.getAll("labelId").length
    ? searchParams.getAll("labelId")
    : searchParams.get("labelIds")?.split(",").filter(Boolean) ?? [];
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sort = searchParams.get("sort") || "createdAt";
  const q = searchParams.get("q")?.trim();

  const where: Prisma.TaskWhereInput = { userId: session.user.id };
  if (q) {
    where.title = { contains: q, mode: "insensitive" };
  }
  if (projectId && projectId !== "all") {
    where.projectId = projectId;
  }
  if (statusParam) {
    const statuses = statusParam.split(",").filter(Boolean) as TaskStatus[];
    if (statuses.length) where.status = { in: statuses };
  }
  if (priorityParam) {
    const priorities = priorityParam.split(",").filter(Boolean) as TaskPriority[];
    if (priorities.length) where.priority = { in: priorities };
  }
  if (labelIds.length) {
    where.labels = { some: { labelId: { in: labelIds } } };
  }
  if (dateFrom || dateTo) {
    where.deadline = {};
    if (dateFrom) where.deadline.gte = new Date(dateFrom);
    if (dateTo) where.deadline.lte = new Date(dateTo);
  }

  let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "deadline") orderBy = { deadline: "asc" };
  if (sort === "priority") orderBy = { priority: "desc" };
  if (sort === "createdAt") orderBy = { createdAt: "desc" };
  if (sort === "title") orderBy = { title: "asc" };

  const tasks = await prisma.task.findMany({
    where,
    include: taskListInclude,
    orderBy,
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }
    const last = await prisma.task.findFirst({
      where: { userId: session.user.id },
      orderBy: { taskRef: "desc" },
      select: { taskRef: true },
    });
    const taskRef = (last?.taskRef ?? 0) + 1;
    const labelIds = data.labelIds ?? [];
    const task = await prisma.task.create({
      data: {
        taskRef,
        title: data.title,
        description: data.description ?? "",
        status: data.status ?? "TODO",
        priority: data.priority ?? "NONE",
        projectId: data.projectId,
        userId: session.user.id,
        deadline: data.deadline ? new Date(data.deadline) : null,
        deadlineRecurrence: data.deadlineRecurrence ?? "NONE",
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        reminderRecurrence: data.reminderRecurrence ?? "NONE",
        reminderSound: data.reminderSound ?? true,
        labels: labelIds.length
          ? {
              create: labelIds.map((labelId) => ({ labelId })),
            }
          : undefined,
      },
      include: taskListInclude,
    });
    await logTaskActivity(task.id, session.user.id, "created", null, task.title);
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
