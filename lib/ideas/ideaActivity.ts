import { prisma } from "@/lib/prisma";

/** Append a row to the per-idea activity log (shown in the UI timeline). */
export async function appendIdeaActivity(ideaId: string, action: string, detail?: string | null) {
  await prisma.ideaActivity.create({
    data: {
      ideaId,
      action,
      detail: detail ?? null,
    },
  });
}
