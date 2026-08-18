import { getSession } from "@/lib/auth";
import { passwordResetHtml, sendRawEmail } from "@/lib/email";
import { notifyTaskCompleted } from "@/lib/taskCompletionNotify";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEST") }),
  z.object({
    type: z.literal("TASK_COMPLETED"),
    taskId: z.string().min(1),
  }),
  z.object({
    type: z.literal("PASSWORD_RESET"),
    email: z.string().email(),
    token: z.string().min(10),
    name: z.string().optional(),
  }),
]);

/**
 * Central email dispatch. Prefer calling from server code after auth checks.
 * TASK_COMPLETED: authenticated, must own task.
 * PASSWORD_RESET: used when triggering reset from trusted server context (optional).
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    if (body.type === "TEST") {
      const session = await getSession();
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { previewUrl, provider } = await sendRawEmail({
        to: session.user.email,
        subject: "Test notification",
        html: `<p style="font-family:system-ui">Your email settings are working.</p>`,
      });
      const likelyEthereal = process.env.SMTP_HOST?.toLowerCase().includes("ethereal");
      return NextResponse.json({
        ok: true,
        previewUrl: previewUrl ?? null,
        provider,
        hint:
          provider === "resend"
            ? "Sent via Resend (HTTPS). Check your inbox and spam folder."
            : likelyEthereal
              ? "Ethereal does not deliver to your real inbox. Open previewUrl (or check the terminal log) to view the message."
              : "If you do not see the message, check spam and confirm the From address is allowed by your provider.",
      });
    }

    if (body.type === "TASK_COMPLETED") {
      const session = await getSession();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const wantEmail = user.emailNotifications;
      const wantWhatsApp =
        user.whatsappNotifications && Boolean(user.whatsappPhone?.trim());
      if (!wantEmail && !wantWhatsApp) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      const task = await prisma.task.findFirst({
        where: { id: body.taskId, userId: session.user.id },
        include: {
          attachments: { orderBy: { createdAt: "asc" } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true, email: true } } },
          },
        },
      });
      if (!task) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await notifyTaskCompleted(user, {
        title: task.title,
        description: task.description,
        completedAt: task.completedAt,
        attachments: task.attachments.map((a) => ({ name: a.name, url: a.url })),
        comments: task.comments.map((c) => ({
          content: c.content,
          authorLabel: c.user.name?.trim() || c.user.email || "Comment",
          createdAt: c.createdAt,
        })),
      });
      return NextResponse.json({ ok: true });
    }

    if (body.type === "PASSWORD_RESET") {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3111";
      const url = `${base}/reset-password?token=${body.token}`;
      await sendRawEmail({
        to: body.email,
        subject: "Reset your password",
        html: passwordResetHtml({ name: body.name ?? "", url }),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported" }, { status: 400 });
  } catch (e) {
    console.error("[notifications/email]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Email failed",
        ...(process.env.NODE_ENV === "development" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
