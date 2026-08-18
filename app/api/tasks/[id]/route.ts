import { logTaskActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { isCompletedTaskStatus, STATUS_LABELS } from "@/lib/constants";
import { notifyTaskCompleted } from "@/lib/taskCompletionNotify";
import { prisma } from "@/lib/prisma";
import { addRecurrence } from "@/lib/recurrence";
import { taskUpdateSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const taskDetailInclude = {
  project: true,
  labels: { include: { label: true } },
  subtasks: { orderBy: { order: "asc" as const } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
  attachments: { orderBy: { createdAt: "asc" as const } },
  activities: {
    orderBy: { createdAt: "desc" as const },
    take: 80,
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  },
} satisfies Prisma.TaskInclude;

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const task = await prisma.task.findFirst({
    where: { id: ctx.params.id, userId: session.user.id },
    include: taskDetailInclude,
  });
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await prisma.task.findFirst({
    where: { id: ctx.params.id, userId: session.user.id },
    include: { labels: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    if (d.projectId) {
      const p = await prisma.project.findFirst({
        where: { id: d.projectId, userId: session.user.id },
      });
      if (!p) {
        return NextResponse.json({ error: "Invalid project" }, { status: 400 });
      }
    }

    const updates: Prisma.TaskUpdateInput = {};
    if (d.title !== undefined && d.title !== existing.title) {
      await logTaskActivity(existing.id, session.user.id, "title", existing.title, d.title);
      updates.title = d.title;
    }
    if (d.description !== undefined && d.description !== existing.description) {
      await logTaskActivity(
        existing.id,
        session.user.id,
        "description",
        existing.description.slice(0, 200),
        d.description.slice(0, 200)
      );
      updates.description = d.description;
    }
    if (d.priority !== undefined && d.priority !== existing.priority) {
      await logTaskActivity(existing.id, session.user.id, "priority", existing.priority, d.priority);
      updates.priority = d.priority;
    }
    if (d.deadline !== undefined) {
      const next =
        d.deadline === null ? null : new Date(d.deadline);
      const prev = existing.deadline?.toISOString() ?? null;
      const nextIso = next?.toISOString() ?? null;
      if (prev !== nextIso) {
        await logTaskActivity(existing.id, session.user.id, "deadline", prev, nextIso);
        updates.deadline = next;
        updates.deadlineReminderSentAt = null;
      }
    }
    if (d.reminderAt !== undefined) {
      const next = d.reminderAt === null ? null : new Date(d.reminderAt);
      const prev = existing.reminderAt?.toISOString() ?? null;
      const nextIso = next?.toISOString() ?? null;
      if (prev !== nextIso) {
        await logTaskActivity(existing.id, session.user.id, "reminder", prev, nextIso);
        updates.reminderAt = next;
      }
    }
    if (d.reminderSound !== undefined && d.reminderSound !== existing.reminderSound) {
      await logTaskActivity(
        existing.id,
        session.user.id,
        "reminderSound",
        String(existing.reminderSound),
        String(d.reminderSound)
      );
      updates.reminderSound = d.reminderSound;
    }
    if (d.reminderSnoozedUntil !== undefined) {
      updates.reminderSnoozedUntil =
        d.reminderSnoozedUntil === null ? null : new Date(d.reminderSnoozedUntil);
    }
    if (d.deadlineRecurrence !== undefined && d.deadlineRecurrence !== existing.deadlineRecurrence) {
      await logTaskActivity(
        existing.id,
        session.user.id,
        "deadlineRecurrence",
        existing.deadlineRecurrence,
        d.deadlineRecurrence
      );
      updates.deadlineRecurrence = d.deadlineRecurrence;
    }
    if (d.reminderRecurrence !== undefined && d.reminderRecurrence !== existing.reminderRecurrence) {
      await logTaskActivity(
        existing.id,
        session.user.id,
        "reminderRecurrence",
        existing.reminderRecurrence,
        d.reminderRecurrence
      );
      updates.reminderRecurrence = d.reminderRecurrence;
    }
    if (d.projectId !== undefined && d.projectId !== existing.projectId) {
      await logTaskActivity(existing.id, session.user.id, "project", existing.projectId, d.projectId);
      updates.project = { connect: { id: d.projectId } };
    }

    let completedAt = existing.completedAt;
    let skipCompletionEmail = false;

    if (d.status !== undefined && d.status !== existing.status) {
      const effectiveDeadlineRecurrence =
        d.deadlineRecurrence !== undefined ? d.deadlineRecurrence : existing.deadlineRecurrence;
      const effectiveReminderRecurrence =
        d.reminderRecurrence !== undefined ? d.reminderRecurrence : existing.reminderRecurrence;

      const rollRecurringInstance =
        isCompletedTaskStatus(d.status) &&
        !isCompletedTaskStatus(existing.status) &&
        effectiveDeadlineRecurrence !== "NONE";

      if (rollRecurringInstance) {
        const from = existing.deadline ? new Date(existing.deadline) : new Date();
        const nextDeadline = addRecurrence(from, effectiveDeadlineRecurrence);
        updates.deadline = nextDeadline;
        updates.deadlineReminderSentAt = null;
        if (effectiveReminderRecurrence !== "NONE" && existing.reminderAt) {
          updates.reminderAt = addRecurrence(
            new Date(existing.reminderAt),
            effectiveReminderRecurrence
          );
        }
        updates.status = "TODO";
        updates.completedAt = null;
        completedAt = null;
        skipCompletionEmail = true;
        await logTaskActivity(
          existing.id,
          session.user.id,
          "recurring",
          from.toISOString(),
          nextDeadline.toISOString()
        );
      } else {
        await logTaskActivity(
          existing.id,
          session.user.id,
          "status",
          STATUS_LABELS[existing.status],
          STATUS_LABELS[d.status]
        );
        updates.status = d.status;
        if (isCompletedTaskStatus(d.status) && !isCompletedTaskStatus(existing.status)) {
          completedAt = new Date();
          updates.completedAt = completedAt;
        } else if (!isCompletedTaskStatus(d.status) && isCompletedTaskStatus(existing.status)) {
          completedAt = null;
          updates.completedAt = null;
        }
      }
    }

    if (d.labelIds !== undefined) {
      const current = new Set(existing.labels.map((l) => l.labelId));
      const next = new Set(d.labelIds);
      const same =
        current.size === next.size && Array.from(current).every((id) => next.has(id));
      if (!same) {
        await prisma.taskLabel.deleteMany({ where: { taskId: existing.id } });
        if (d.labelIds.length) {
          await prisma.taskLabel.createMany({
            data: d.labelIds.map((labelId) => ({ taskId: existing.id, labelId })),
            skipDuplicates: true,
          });
        }
        await logTaskActivity(
          existing.id,
          session.user.id,
          "labels",
          Array.from(current).join(","),
          d.labelIds.join(",")
        );
      }
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: updates,
      include: taskDetailInclude,
    });

    if (
      !skipCompletionEmail &&
      d.status !== undefined &&
      isCompletedTaskStatus(d.status) &&
      !isCompletedTaskStatus(existing.status)
    ) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user) {
        await notifyTaskCompleted(user, {
          title: task.title,
          description: task.description,
          completedAt,
          attachments: task.attachments.map((a) => ({ name: a.name, url: a.url })),
          comments: task.comments.map((c) => ({
            content: c.content,
            authorLabel: c.user.name?.trim() || c.user.email || "Comment",
            createdAt: c.createdAt,
          })),
        });
      }
    }

    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await prisma.task.findFirst({
    where: { id: ctx.params.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.task.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
