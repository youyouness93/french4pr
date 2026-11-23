// All class times are entered and shown in Toronto time (Eastern Time).
export const TZ = "America/Toronto";

/** Offset in ms between the time zone's wall clock and UTC at a given instant. */
function tzOffset(instant: number, timeZone = TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2026-12-01" + "19:00" in Toronto → Date (UTC instant). Handles DST changes. */
export function zonedToUtc(date: string, time: string, timeZone = TZ): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall - tzOffset(wall, timeZone);
  guess = wall - tzOffset(guess, timeZone);
  return new Date(guess);
}

/** Today's date in Toronto as YYYY-MM-DD. */
export function todayInTz(timeZone = TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Adds days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a YYYY-MM-DD string. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

/** Monday of the week containing the given YYYY-MM-DD. */
export function mondayOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** The date (YYYY-MM-DD) of an instant, in Toronto. */
export function dateInTz(iso: string, timeZone = TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));

/** Formats a plain YYYY-MM-DD (no time zone shift). */
export function fmtDate(date: string | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Whole months from today (Toronto) to a date; negative if past. */
export function monthsUntil(date: string): number {
  const [y1, m1] = todayInTz().split("-").map(Number);
  const [y2, m2] = date.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** "in 2 h 15 min" / "in 3 days" / "now". */
export function relativeFromNow(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  if (mins < 60 * 24) return `in ${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ""}`.trim();
  const days = Math.round(mins / 1440);
  return `in ${days} day${days > 1 ? "s" : ""}`;
}
