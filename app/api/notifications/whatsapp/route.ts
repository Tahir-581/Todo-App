import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWhatsAppBotConfigured, runWhatsAppSend } from "@/lib/whatsappBot";
import { parseWhatsAppPhoneList } from "@/lib/whatsappReportPhones";
import { NextResponse } from "next/server";

/** Sends a short test message via the Selenium bot (same path as task completion). */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const phones = parseWhatsAppPhoneList(user?.whatsappPhone).phones;
    if (phones.length === 0) {
      return NextResponse.json(
        { error: "Set at least one WhatsApp number in settings (international +…). Use commas for multiple." },
        { status: 400 }
      );
    }
    if (!isWhatsAppBotConfigured()) {
      return NextResponse.json(
        {
          error: "Server is not configured for WhatsApp",
          hint: "Add whatsapp_bot.py to the project root or set WHATSAPP_BOT_SCRIPT. Install Python deps: pip install selenium webdriver-manager schedule colorama tabulate.",
        },
        { status: 503 }
      );
    }
    for (const phone of phones) {
      const r = await runWhatsAppSend({
        phone,
        message: "Todo app: test WhatsApp notification.",
      });
      if (!r.ok) {
        return NextResponse.json(
          {
            error: "WhatsApp bot failed",
            ...(process.env.NODE_ENV === "development" ? { detail: r.stderr, exitCode: r.exitCode } : {}),
          },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ ok: true, recipientCount: phones.length });
  } catch (e) {
    console.error("[notifications/whatsapp]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "WhatsApp test failed",
        ...(process.env.NODE_ENV === "development" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
