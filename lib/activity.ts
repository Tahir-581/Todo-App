import { prisma } from "@/lib/prisma";

export async function logTaskActivity(
  taskId: string,
  userId: string,
  action: string,
  oldValue?: string | null,
  newValue?: string | null
) {
  await prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      action,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}
