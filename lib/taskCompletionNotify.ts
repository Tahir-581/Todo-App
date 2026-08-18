import { format } from "date-fns";
import { completionEmailHtml, sendRawEmail } from "@/lib/email";
// import { isWhatsAppBotConfigured, sendTaskCompletionWhatsApp } from "@/lib/whatsappBot";
// import { parseWhatsAppPhoneList } from "@/lib/whatsappReportPhones";

type NotifyUser = {
  email: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  whatsappPhone: string | null;
};

type NotifyTaskComment = {
  content: string;
  authorLabel: string;
  createdAt: Date;
};

type NotifyTask = {
  title: string;
  description: string;
  completedAt: Date | null;
  attachments: { name: string; url: string }[];
  comments?: NotifyTaskComment[];
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function buildEmailCommentRows(comments: NotifyTaskComment[]) {
  return comments.map((c) => ({
    author: c.authorLabel,
    at: format(c.createdAt, "PPp"),
    content: stripHtml(c.content).trim().slice(0, 4000),
  }));
}

/** Description plus formatted comments, capped for WhatsApp body budget. (Unused while task-completion WhatsApp is disabled.) */
// function buildWhatsAppNotesPlain(description: string, comments: NotifyTaskComment[] | undefined): string {
//   const desc = stripHtml(description).trim().slice(0, 2000);
//   const list = comments ?? [];
//   const parts: string[] = [];
//   if (desc) {
//     parts.push("Description:", desc);
//   }
//   if (list.length) {
//     if (parts.length) {
//       parts.push("");
//     }
//     parts.push("Comments:");
//     for (const c of list) {
//       const body = stripHtml(c.content).trim();
//       parts.push(`Comment (${c.authorLabel}):`, body, "");
//     }
//   }
//   const joined = parts.join("\n").trim();
//   return joined.length > 3500 ? `${joined.slice(0, 3497)}...` : joined;
// }

export async function notifyTaskCompleted(user: NotifyUser, task: NotifyTask): Promise<void> {
  const completedAt = task.completedAt ?? new Date();
  const notesPlain = stripHtml(task.description).slice(0, 2000);
  const comments = task.comments ?? [];
  const emailCommentRows = buildEmailCommentRows(comments);
  // const whatsAppNotesPlain = buildWhatsAppNotesPlain(task.description, comments);

  if (user.emailNotifications) {
    try {
      await sendRawEmail({
        to: user.email,
        subject: `Completed: ${task.title}`,
        html: completionEmailHtml({
          taskTitle: task.title,
          completedAt: format(completedAt, "PPpp"),
          notes: notesPlain,
          comments: emailCommentRows.length ? emailCommentRows : undefined,
          imageAttachments: task.attachments,
        }),
      });
    } catch (e) {
      console.error("[taskCompletionNotify] email failed:", e);
    }
  }

  // --- Task completion WhatsApp disabled (task status / done notifications) ---
  // const completionWhatsAppPhones = parseWhatsAppPhoneList(user.whatsappPhone).phones;
  // if (user.whatsappNotifications && completionWhatsAppPhones.length > 0) {
  //   if (!isWhatsAppBotConfigured()) {
  //     console.warn(
  //       "[taskCompletionNotify] WhatsApp notifications on but whatsapp_bot.py was not found (add it to the project root or set WHATSAPP_BOT_SCRIPT)."
  //     );
  //     return;
  //   }
  //   try {
  //     for (const phone of completionWhatsAppPhones) {
  //       await sendTaskCompletionWhatsApp({
  //         phone,
  //         title: task.title,
  //         completedAtLabel: format(completedAt, "PPpp"),
  //         notesPlain: whatsAppNotesPlain,
  //         attachments: task.attachments,
  //       });
  //     }
  //   } catch (e) {
  //     console.error("[taskCompletionNotify] WhatsApp failed:", e);
  //   }
  // }
}
