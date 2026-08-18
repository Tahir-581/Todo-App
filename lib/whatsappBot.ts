import { spawn } from "child_process";
import { existsSync } from "fs";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

const IMAGE_URL_RE = /\.(jpe?g|png|gif|webp)(\?|#|$)/i;

/** Default when `WHATSAPP_BOT_SCRIPT` is unset: `whatsapp_bot.py` in the app root (next to `package.json`). */
const DEFAULT_BOT_FILENAME = "whatsapp_bot.py";

/**
 * Resolves script path and working directory for the Selenium bot.
 * - If `WHATSAPP_BOT_SCRIPT` is set, that file is used; cwd is `WHATSAPP_BOT_CWD` or the script’s directory.
 * - Otherwise, if `./whatsapp_bot.py` exists under `process.cwd()`, it is used with cwd = project root.
 */
export function resolveWhatsAppBotPaths(): { scriptPath: string; cwd: string } | null {
  const explicit = process.env.WHATSAPP_BOT_SCRIPT?.trim();
  if (explicit) {
    const scriptPath = path.isAbsolute(explicit)
      ? explicit
      : path.join(process.cwd(), explicit);
    const cwd =
      process.env.WHATSAPP_BOT_CWD?.trim() || path.dirname(scriptPath);
    return existsSync(scriptPath) ? { scriptPath, cwd } : null;
  }
  const bundled = path.join(process.cwd(), DEFAULT_BOT_FILENAME);
  if (existsSync(bundled)) {
    return { scriptPath: bundled, cwd: process.cwd() };
  }
  return null;
}

/** Selenium cannot run inside Vercel serverless; treat WhatsApp as unavailable there so email still delivers. */
function isWhatsAppRunnableEnvironment(): boolean {
  return process.env.VERCEL !== "1";
}

export function isWhatsAppBotConfigured(): boolean {
  if (!isWhatsAppRunnableEnvironment()) return false;
  return resolveWhatsAppBotPaths() !== null;
}

function scriptPathAndCwd(): { scriptPath: string; cwd: string } {
  const resolved = resolveWhatsAppBotPaths();
  if (!resolved) {
    throw new Error("WhatsApp bot script not found");
  }
  return resolved;
}

export function getWhatsAppPythonExecutable(): string {
  return (
    process.env.WHATSAPP_PYTHON?.trim() ||
    (process.platform === "win32" ? "python" : "python3")
  );
}

export async function runWhatsAppSend(opts: {
  phone: string;
  message: string;
  imagePath?: string | null;
}): Promise<{ ok: boolean; exitCode: number; stderr: string }> {
  if (!isWhatsAppBotConfigured()) {
    return {
      ok: false,
      exitCode: 1,
      stderr: `Missing ${DEFAULT_BOT_FILENAME} in project root (or set WHATSAPP_BOT_SCRIPT).`,
    };
  }
  const { scriptPath, cwd } = scriptPathAndCwd();
  const python = getWhatsAppPythonExecutable();
  /** UTF-8 temp file avoids Windows argv length limits and quoting bugs for long digest messages. */
  const messageFile = path.join(
    os.tmpdir(),
    `todo-wa-msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.txt`
  );
  const args = [scriptPath, "--send", opts.phone, "--message-file", messageFile];
  if (opts.imagePath) {
    args.push("--image", opts.imagePath);
  }

  const phoneLog = opts.phone.replace(/\d(?=\d{4})/g, "*");
  console.log(
    `[whatsappBot] send start phone=${phoneLog} messageChars=${opts.message.length} script=${scriptPath}`
  );

  try {
    await fs.writeFile(messageFile, opts.message, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[whatsappBot] failed to write message temp file", msg);
    return { ok: false, exitCode: 1, stderr: msg };
  }

  const unlinkMsgFile = () => void fs.unlink(messageFile).catch(() => {});

  return new Promise((resolve, reject) => {
    const child = spawn(python, args, {
      cwd,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      windowsHide: true,
    });
    let stderr = "";
    let stdout = "";
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.on("error", (err) => {
      unlinkMsgFile();
      reject(err);
    });
    child.on("close", (code) => {
      unlinkMsgFile();
      const exitCode = code ?? 1;
      const combined = [stderr, stdout].filter(Boolean).join("\n");
      if (exitCode === 0) {
        console.log(`[whatsappBot] send ok phone=${phoneLog}`);
      } else {
        console.error(
          `[whatsappBot] send failed phone=${phoneLog} exit=${exitCode}`,
          process.env.NODE_ENV === "development" ? combined.slice(0, 800) : ""
        );
      }
      resolve({
        ok: exitCode === 0,
        exitCode,
        stderr: combined,
      });
    });
  });
}

export function buildTaskCompletedWhatsAppText(params: {
  title: string;
  completedAtLabel: string;
  notesPlain: string;
}): string {
  const lines = [
    "*Task completed*",
    "",
    params.title,
    `Completed: ${params.completedAtLabel}`,
  ];
  if (params.notesPlain.trim()) {
    lines.push("", params.notesPlain.trim().slice(0, 3500));
  }
  const text = lines.join("\n");
  return text.length > 4000 ? `${text.slice(0, 3997)}...` : text;
}

export function pickFirstImageAttachment(
  attachments: { name: string; url: string }[]
): { name: string; url: string } | null {
  for (const a of attachments) {
    if (a.url.startsWith("data:image/")) {
      return a;
    }
    if (IMAGE_URL_RE.test(a.url) || IMAGE_URL_RE.test(a.name)) {
      return a;
    }
  }
  return null;
}

/** Writes one attachment to a file inside `dir`. Returns absolute path or null. */
export async function writeImageAttachmentToFile(
  att: { name: string; url: string },
  dir: string
): Promise<string | null> {
  try {
    if (att.url.startsWith("data:")) {
      const m = /^data:image\/([\w+.-]+);base64,([\s\S]+)$/.exec(att.url);
      if (!m) {
        return null;
      }
      const mimeSub = m[1].toLowerCase().replace("+xml", "");
      const ext =
        mimeSub === "jpeg" || mimeSub === "jpg"
          ? "jpg"
          : mimeSub === "png" || mimeSub === "gif" || mimeSub === "webp"
            ? mimeSub
            : "img";
      const buf = Buffer.from(m[2], "base64");
      const dest = path.join(dir, `attach.${ext}`);
      await fs.writeFile(dest, buf);
      return dest;
    }
    const res = await fetch(att.url);
    if (!res.ok) {
      return null;
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) {
      return null;
    }
    const ab = await res.arrayBuffer();
    let ext = "img";
    if (ct.includes("png")) {
      ext = "png";
    } else if (ct.includes("jpeg") || ct.includes("jpg")) {
      ext = "jpg";
    } else if (ct.includes("gif")) {
      ext = "gif";
    } else if (ct.includes("webp")) {
      ext = "webp";
    }
    const dest = path.join(dir, `attach.${ext}`);
    await fs.writeFile(dest, Buffer.from(ab));
    return dest;
  } catch {
    return null;
  }
}

export async function sendTaskCompletionWhatsApp(params: {
  phone: string;
  title: string;
  completedAtLabel: string;
  notesPlain: string;
  attachments: { name: string; url: string }[];
}): Promise<void> {
  const text = buildTaskCompletedWhatsAppText(params);
  const imageAtt = pickFirstImageAttachment(params.attachments);
  let tmpDir: string | null = null;
  let imagePath: string | undefined;

  if (imageAtt) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "todo-wa-"));
    const written = await writeImageAttachmentToFile(imageAtt, tmpDir);
    if (written) {
      imagePath = written;
    } else {
      await fs.rm(tmpDir, { recursive: true }).catch(() => {});
      tmpDir = null;
    }
  }

  try {
    const r = await runWhatsAppSend({
      phone: params.phone,
      message: text,
      imagePath,
    });
    if (!r.ok) {
      throw new Error(r.stderr || `WhatsApp bot exited with code ${r.exitCode}`);
    }
  } finally {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true }).catch(() => {});
    }
  }
}
