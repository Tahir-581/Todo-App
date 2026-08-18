/** Same rule as PATCH /api/user for `whatsappPhone`. */
export const WHATSAPP_E164_RE = /^\+[1-9]\d{6,14}$/;

export function validateWhatsAppE164(phone: string): string | null {
  const t = phone.trim();
  if (!t) return null;
  return WHATSAPP_E164_RE.test(t) ? t : null;
}

export function parseWhatsAppPhoneList(raw: string | null | undefined): {
  phones: string[];
  invalid: string[];
} {
  if (!raw?.trim()) {
    return { phones: [], invalid: [] };
  }
  const phones: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const p of parts) {
    const v = validateWhatsAppE164(p);
    if (!v) {
      invalid.push(p);
      continue;
    }
    if (!seen.has(v)) {
      seen.add(v);
      phones.push(v);
    }
  }
  return { phones, invalid };
}

/**
 * Distinct E.164 numbers for the daily WhatsApp report: primary `whatsappPhone` plus extra recipients.
 */
export function dailyReportWhatsAppPhoneList(
  whatsappPhone: string | null | undefined,
  extras: { phone: string }[]
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = validateWhatsAppE164(raw);
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };
  for (const phone of parseWhatsAppPhoneList(whatsappPhone).phones) add(phone);
  for (const r of extras) add(r.phone);
  return out;
}
