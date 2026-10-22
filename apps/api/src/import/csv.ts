/** Manual import (WBS 3.3): a small, strict CSV format families can export or type. Pure + testable. */
const IMPORT_COLUMNS = ["class", "teacher", "period", "assignment", "due", "status", "score", "max_score"] as const;
const MAX_ROWS = 2000;
const STATUSES = new Set(["assigned", "submitted", "missing", "late", "graded", "excused"]);

export interface ImportRow {
  className: string;
  teacher: string | null;
  period: string | null;
  title: string;
  dueAt: string | null;
  status: string | null;
  score: number | null;
  maxScore: number | null;
}

/** RFC-4180-ish line splitter (quotes, escaped quotes, commas in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const num = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function validateImport(text: string): { rows: ImportRow[]; errors: string[] } {
  const errors: string[] = [];
  if (text.length > 1_000_000) return { rows: [], errors: ["File too large (max 1 MB)."] };
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  if (table.length === 0) return { rows: [], errors: ["File is empty."] };
  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, header.indexOf(c)]));
  for (const req of ["class", "assignment"] as const) if (idx[req]! < 0) errors.push(`Missing column "${req}".`);
  if (errors.length) return { rows: [], errors };
  if (table.length - 1 > MAX_ROWS) return { rows: [], errors: [`Too many rows (max ${MAX_ROWS}).`] };
  const rows: ImportRow[] = [];
  table.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (c: (typeof IMPORT_COLUMNS)[number]) => (idx[c]! >= 0 ? (r[idx[c]!] ?? "").trim() : "");
    const className = get("class").slice(0, 120);
    const title = get("assignment").slice(0, 200);
    if (!className || !title) return void errors.push(`Line ${line}: class and assignment are required.`);
    const dueRaw = get("due");
    let dueAt: string | null = null;
    if (dueRaw) {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? new Date(`${dueRaw}T23:59:00-05:00`) : new Date(dueRaw);
      if (Number.isNaN(d.getTime())) return void errors.push(`Line ${line}: bad due date "${dueRaw}".`);
      dueAt = d.toISOString();
    }
    const status = get("status").toLowerCase() || null;
    if (status && !STATUSES.has(status)) return void errors.push(`Line ${line}: unknown status "${status}".`);
    const score = num(get("score"));
    const maxScore = num(get("max_score"));
    if (Number.isNaN(score) || Number.isNaN(maxScore)) return void errors.push(`Line ${line}: score must be a number.`);
    rows.push({
      className,
      teacher: get("teacher") || null,
      period: get("period") || null,
      title,
      dueAt,
      status,
      score,
      maxScore,
    });
  });
  return { rows, errors };
}

export async function keyOf(...parts: (string | null)[]): Promise<string> {
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(parts.map((p) => (p ?? "").toLowerCase()).join("|")),
  );
  return [...new Uint8Array(d)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
