/**
 * Calls the daily-report cron on an interval so local `next dev` behaves like Vercel cron.
 * Reads CRON_SECRET and optional CRON_POLL_BASE_URL from `.env` in the project root.
 *
 * Usage: `node scripts/poll-cron.mjs` (also started by default via `npm run dev`)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...loadDotEnv(), ...process.env };
const secret = env.CRON_SECRET?.trim();
const base =
  env.CRON_POLL_BASE_URL?.trim()?.replace(/\/$/, "") ||
  env.NEXTAUTH_URL?.trim()?.replace(/\/$/, "") ||
  "http://localhost:3111";
const intervalMs = Math.max(15_000, Number(env.CRON_POLL_INTERVAL_MS) || 60_000);

const url = `${base}/api/cron/progress-tracker/daily-report`;

if (!secret) {
  console.warn(
    "[poll-cron] CRON_SECRET is missing — scheduled daily reports will not run. Add CRON_SECRET to .env (same value the API checks)."
  );
  /** Keep process alive so `npm run dev` (concurrently) still runs Next.js only. */
  await new Promise(() => {});
}

async function tick() {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-cron-secret": secret },
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    const t = new Date().toISOString();
    if (!res.ok) {
      console.error(`[poll-cron] ${t} HTTP ${res.status}`, json);
      return;
    }
    const s = json.sentWhatsApp ?? 0;
    const e = json.sentEmail ?? 0;
    const skipWa = json.skippedAlreadySentWhatsApp ?? 0;
    const skipEarly = json.skippedTooEarly ?? 0;
    const noBot = json.skippedWhatsAppNoBot ?? 0;
    const waOk = json.whatsappBotConfigured;
    if (e > 0 || s > 0 || (json.errors && json.errors.length)) {
      console.log(`[poll-cron] ${t} ok sentEmail=${e} sentWhatsApp=${s} skippedWaDup=${skipWa} tooEarly=${skipEarly} noBotUsers=${noBot} waBot=${waOk}`, json.errors || "");
    } else {
      process.stdout.write(".");
    }
  } catch (err) {
    const t = new Date().toISOString();
    if (err?.cause?.code === "ECONNREFUSED" || err?.code === "ECONNREFUSED") {
      process.stdout.write("x");
    } else {
      console.error(`[poll-cron] ${t}`, err?.message || err);
    }
  }
}

console.log(`[poll-cron] Every ${intervalMs / 1000}s → GET ${url}`);
console.log("[poll-cron] Waiting for Next.js (. = idle, x = connection refused)\n");

await tick();
setInterval(tick, intervalMs);
