/** datetime-local <-> ISO, interpreted in America/New_York (DEC-100). */
const TZ = "America/New_York";
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}
export function fromLocalInput(v: string): string | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  for (let off = 4; off <= 5; off++) {
    const iso = new Date(guess + off * 3600_000).toISOString();
    if (toLocalInput(iso) === v) return iso;
  }
  return new Date(guess + 5 * 3600_000).toISOString();
}
