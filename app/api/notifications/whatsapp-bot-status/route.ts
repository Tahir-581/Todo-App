import { isWhatsAppBotConfigured } from "@/lib/whatsappBot";
import { NextResponse } from "next/server";

/** Whether `whatsapp_bot.py` (or WHATSAPP_BOT_SCRIPT) is present on the server — required for scheduled WhatsApp. */
export async function GET() {
  return NextResponse.json({ configured: isWhatsAppBotConfigured() });
}
