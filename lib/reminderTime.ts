/** 24h clock string for `<input type="time" />` (always HH:mm). */
export function minutesSinceMidnightToHHMM(totalMinutes: number): string {
  const m = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function hhmmToMinutesSinceMidnight(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutesAs12h(totalMinutes: number): string {
  const m = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "am" : "pm";
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}
