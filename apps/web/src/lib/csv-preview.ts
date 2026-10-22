/** Client-side pre-flight for the manual import CSV (mirrors API header rules; API stays authoritative). */
export const IMPORT_HEADER = "class,teacher,period,assignment,due,status,score,max_score";
const MAX_BYTES = 1_000_000;

export type Preflight = { ok: true; rows: number } | { ok: false; error: string };

export function preflightCsv(text: string): Preflight {
  if (new TextEncoder().encode(text).length > MAX_BYTES) return { ok: false, error: "File is larger than 1 MB." };
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lines.length < 2) return { ok: false, error: "The file needs a header row and at least one assignment." };
  const header = lines[0]!.toLowerCase().replace(/\s+/g, "");
  for (const col of ["class", "assignment"]) {
    if (!header.split(",").includes(col)) return { ok: false, error: `Missing required column "${col}".` };
  }
  if (lines.length - 1 > 2000) return { ok: false, error: "At most 2,000 rows per import." };
  return { ok: true, rows: lines.length - 1 };
}
