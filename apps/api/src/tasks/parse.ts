/** FR-21 deterministic natural-language task parser (DEC-100). Pure, no network; AI fallback only when confidence is low. */
export type Priority = "low" | "normal" | "high";
export interface ClassRef {
  id: string;
  name: string;
}
export interface ParsedTask {
  title: string;
  dueAt: string | null; // ISO UTC; local time is America/New_York
  dueLabel: string | null;
  classId: string | null;
  className: string | null;
  priority: Priority;
  confidence: number; // 0..1
  needsReview: true; // FR-21: always confirm/edit before saving
}

const TZ = "America/New_York";
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ALIASES: Record<string, string[]> = {
  biology: ["bio"],
  chemistry: ["chem"],
  mathematics: ["math"],
  math: ["maths"],
  english: ["ela"],
  history: ["hist"],
  physics: ["phys"],
  spanish: ["span"],
  "physical education": ["pe", "gym"],
};

/** Offset (minutes) of New York from UTC at a given instant. */
function nyOffset(at: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - at.getTime()) / 60000;
}
/** Wall-clock NY date/time -> UTC instant. */
export function nyToUtc(y: number, m: number, d: number, hh: number, mm: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off = nyOffset(guess);
  const t = new Date(guess.getTime() - off * 60000);
  const off2 = nyOffset(t);
  return off2 === off ? t : new Date(guess.getTime() - off2 * 60000);
}
function nyParts(at: Date) {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(at);
  const g = (t: string) => s.find((x) => x.type === t)!.value;
  return { y: +g("year"), m: +g("month"), d: +g("day"), dow: DAYS.indexOf(g("weekday").toLowerCase()) };
}
function addDays(y: number, m: number, d: number, n: number) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseTask(input: string, now: Date, classes: ClassRef[] = []): ParsedTask {
  let text = input.replace(/\s+/g, " ").trim().slice(0, 300);
  let conf = 0.5;
  const today = nyParts(now);
  let day: { y: number; m: number; d: number } | null = null;
  let time: { hh: number; mm: number } | null = null;
  const cut = (re: RegExp) => {
    text = text.replace(re, " ").replace(/\s+/g, " ").trim();
  };

  // Time: "at 7pm", "by 5:30 pm", "tonight"
  const tm = text.match(/\b(?:at|by|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (tm) {
    let hh = +tm[1]! % 12;
    if (tm[3]!.toLowerCase() === "pm") hh += 12;
    time = { hh, mm: tm[2] ? +tm[2] : 0 };
    cut(new RegExp(esc(tm[0]), "i"));
  }
  if (/\btonight\b/i.test(text)) {
    day = { ...today };
    time ??= { hh: 19, mm: 0 };
    cut(/\btonight\b/i);
  }

  // Date
  let m: RegExpMatchArray | null;
  if (!day && (m = text.match(/\b(?:by |on |due )?(today|tomorrow|tmrw|tmr)\b/i))) {
    day = m[1]!.toLowerCase() === "today" ? { ...today } : addDays(today.y, today.m, today.d, 1);
    cut(new RegExp(esc(m[0]), "i"));
  } else if (!day && (m = text.match(/\bin (\d{1,2}) (day|days|week|weeks)\b/i))) {
    const n = +m[1]! * (m[2]!.startsWith("week") ? 7 : 1);
    day = addDays(today.y, today.m, today.d, n);
    cut(new RegExp(esc(m[0]), "i"));
  } else if (
    !day &&
    (m = text.match(/\b(?:by |on |due |this |next )*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\b/i))
  ) {
    const target = DAYS.findIndex((x) => x.startsWith(m![1]!.toLowerCase().slice(0, 3)));
    let delta = (target - today.dow + 7) % 7;
    if (delta === 0) delta = 7;
    if (/\bnext\b/i.test(m[0]) && delta < 7) delta += 7;
    day = addDays(today.y, today.m, today.d, delta);
    cut(new RegExp(esc(m[0]), "i"));
  } else if (!day && (m = text.match(/\b(?:by |on |due )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    let y = m[3] ? +m[3] : today.y;
    if (y < 100) y += 2000;
    day = { y, m: +m[1]!, d: +m[2]! };
    if (!m[3] && (day.m < today.m || (day.m === today.m && day.d < today.d))) day.y += 1;
    cut(new RegExp(esc(m[0]), "i"));
  } else if (
    !day &&
    (m = text.match(
      /\b(?:by |on |due )?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?\b/i,
    ))
  ) {
    day = { y: today.y, m: MONTHS.indexOf(m[1]!.toLowerCase().slice(0, 3)) + 1, d: +m[2]! };
    if (day.m < today.m || (day.m === today.m && day.d < today.d)) day.y += 1;
    cut(new RegExp(esc(m[0]), "i"));
  }
  if (day && (day.m < 1 || day.m > 12 || day.d < 1 || day.d > 31)) day = null;
  if (!day && time) day = { ...today };
  if (day) conf += 0.3;

  // Priority
  let priority: Priority = "normal";
  if (/(!{2,}|\b(urgent|asap|important|high priority)\b)/i.test(text)) {
    priority = "high";
    cut(/!{2,}|\b(urgent|asap|important|high priority)\b/gi);
  } else if (/\b(low priority|whenever|someday|no rush)\b/i.test(text)) {
    priority = "low";
    cut(/\b(low priority|whenever|someday|no rush)\b/gi);
  }

  // Class link
  let cls: ClassRef | null = null;
  const lower = text.toLowerCase();
  for (const c of classes) {
    const n = c.name.toLowerCase();
    const keys = [
      n,
      ...Object.entries(ALIASES)
        .filter(([k]) => n.includes(k))
        .flatMap(([, v]) => v),
    ];
    if (keys.some((k) => new RegExp(`\\b${esc(k)}\\b`).test(lower))) {
      cls = c;
      conf += 0.1;
      break;
    }
  }

  // Title cleanup
  let title = text.replace(
    /^(please )?(remind me|reminder|remember|i need|need|don'?t forget|todo|to-do)( to)?[:,]?\s*/i,
    "",
  );
  title = title
    .replace(/^(to )/i, "")
    .replace(/\s+(by|on|at|due)$/i, "")
    .replace(/[\s,.;:-]+$/, "")
    .trim();
  if (!title) {
    title = input.trim().slice(0, 120);
    conf = 0.2;
  }
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 120) title = title.slice(0, 117) + "...";

  const t = time ?? { hh: 23, mm: 59 };
  const due = day ? nyToUtc(day.y, day.m, day.d, t.hh, t.mm) : null;
  const dueLabel = due
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(due) + " ET"
    : null;
  return {
    title,
    dueAt: due ? due.toISOString() : null,
    dueLabel,
    classId: cls?.id ?? null,
    className: cls?.name ?? null,
    priority,
    confidence: Math.min(1, conf),
    needsReview: true,
  };
}
