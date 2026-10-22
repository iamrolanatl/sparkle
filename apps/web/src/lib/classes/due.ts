const TZ = "America/New_York";
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
/** Whole calendar days from today (ET) to the due date (ET). */
export function daysUntil(iso: string, now = new Date()) {
  return Math.round((Date.parse(ymd(new Date(iso))) - Date.parse(ymd(now))) / 86_400_000);
}
export function dueText(iso: string | null, now = new Date()) {
  if (!iso) return "No date";
  const n = daysUntil(iso, now);
  const md = new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
  if (n < 0) return n === -1 ? "Yesterday" : `${-n} days late · ${md}`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n <= 7) return `In ${n} days · ${md}`;
  return md;
}
export function shortDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" }) : "";
}
