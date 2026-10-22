/** FR-23: heuristic field extraction from (already redacted) OCR text. Suggestions only; user reviews (DEC-120). */
type DocKind = "permission_slip" | "report_card" | "schedule" | "notice" | "other";

export interface ExtractedFields {
  kind: DocKind;
  title: string | null;
  school: string | null;
  studentName: string | null;
  dates: string[]; // ISO yyyy-mm-dd
  dueDate: string | null;
  amounts: string[];
  signatureRequired: boolean;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y < 100 ? 2000 + y : y}-${pad(m)}-${pad(d)}` : null;

export function findDates(text: string, defaultYear = new Date().getUTCFullYear()): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const v = iso(m[3] ? Number(m[3]) : defaultYear, Number(m[1]), Number(m[2]));
    if (v) out.add(v);
  }
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const v = iso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (v) out.add(v);
  }
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? ?(\d{4})?\b/g)) {
    const mi = MONTHS.indexOf(m[1]!.slice(0, 3).toLowerCase());
    if (mi < 0) continue;
    const v = iso(m[3] ? Number(m[3]) : defaultYear, mi + 1, Number(m[2]));
    if (v) out.add(v);
  }
  return [...out].sort();
}

const line = (text: string, re: RegExp) => {
  const m = text.match(re);
  return m?.[1]?.trim().slice(0, 120) || null;
};

export function extractFields(text: string, defaultYear?: number): ExtractedFields {
  const t = text.slice(0, 50_000);
  const lower = t.toLowerCase();
  const kind: DocKind = /permission|field trip|consent/.test(lower)
    ? "permission_slip"
    : /report card|progress report|gpa|grade report/.test(lower)
      ? "report_card"
      : /bell schedule|period \d|schedule/.test(lower)
        ? "schedule"
        : /notice|announcement|dear (parent|families|guardian)/.test(lower)
          ? "notice"
          : "other";
  const dates = findDates(t, defaultYear);
  const dueLine = t.match(/(?:due|return(?:ed)? by|deadline|no later than)[^\n]{0,60}/i)?.[0];
  const dueDate = dueLine ? (findDates(dueLine, defaultYear)[0] ?? null) : null;
  return {
    kind,
    title:
      t
        .split(/\n/)
        .map((s) => s.trim())
        .find((s) => s.length > 3)
        ?.slice(0, 120) ?? null,
    school: line(t, /^\s*([^\n]*(?:school|academy|elementary|middle|high)[^\n]*)$/im),
    studentName: line(t, /student(?: name)?\s*[:\-]\s*([^\n]+)/i),
    dates,
    dueDate,
    amounts: [...new Set([...t.matchAll(/\$\s?\d{1,5}(?:\.\d{2})?/g)].map((m) => m[0].replace(/\s/g, "")))],
    signatureRequired: /signature|sign (?:and|&) return|parent sign/i.test(t),
  };
}
