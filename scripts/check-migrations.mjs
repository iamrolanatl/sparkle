#!/usr/bin/env node
// Migration safety + order lint (SOP-15, CR-0010). Fails CI on destructive SQL or bad naming/order.
// Usage: node scripts/check-migrations.mjs [--base <git-ref>]
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const DIR = "supabase/migrations";
// Files at or before this timestamp predate SOP-15 and are grandfathered (reviewed under SOP-03).
const CUTOFF = "20261022020000";
const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;
const NEW_NAME = /^\d{14}_(int|a|b|c|d|e)_[a-z0-9_]+\.sql$/;
const OVERRIDE = /--\s*destructive-ok:\s*CR-\d{4}/i;
const RULES = [
  [
    /\bdrop\s+(table|schema|column|type|view|materialized\s+view|function|extension|index|trigger|policy|sequence)\b/i,
    "DROP",
  ],
  [/\btruncate\b/i, "TRUNCATE"],
  [/\bdelete\s+from\b/i, "DELETE (data rewrite)"],
  [/\bupdate\s+[\w."]+\s+set\b/i, "UPDATE (data rewrite)"],
  [
    /\balter\s+table\b[^;]*\b(drop|rename|alter\s+column\s+[\w"]+\s+(set\s+data\s+)?type)\b/i,
    "destructive ALTER TABLE",
  ],
  [/\balter\s+[\w\s]*\brename\b/i, "RENAME"],
  [/\bdisable\s+row\s+level\s+security\b/i, "DISABLE RLS"],
];

const stripComments = (sql) => sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const errors = [];
const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const seen = new Set();
for (const f of files) {
  const m = NAME.exec(f);
  if (!m) {
    errors.push(`${f}: name must be <14-digit timestamp>_<name>.sql`);
    continue;
  }
  if (seen.has(m[1])) errors.push(`${f}: duplicate timestamp ${m[1]}`);
  seen.add(m[1]);
  if (m[1] <= CUTOFF) continue;
  if (!NEW_NAME.test(f)) errors.push(`${f}: new migrations must be <timestamp>_<int|a|b|c|d|e>_<name>.sql`);
  const raw = readFileSync(`${DIR}/${f}`, "utf8");
  if (!/--\s*rollback:/i.test(raw)) errors.push(`${f}: missing "-- rollback:" note`);
  if (!OVERRIDE.test(raw)) {
    const sql = stripComments(raw);
    for (const [re, label] of RULES)
      if (re.test(sql)) errors.push(`${f}: ${label} not allowed (additive only; needs "-- destructive-ok: CR-xxxx")`);
  }
}

// Order lint: migrations added in this PR must sort after every migration already on the base branch.
const bi = process.argv.indexOf("--base");
if (bi > 0) {
  const base = process.argv[bi + 1];
  try {
    const onBase = execSync(`git ls-tree --name-only ${base} ${DIR}/`, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((p) => p.split("/").pop())
      .sort();
    const latest = onBase.at(-1) ?? "";
    const added = files.filter((f) => !onBase.includes(f));
    for (const f of added)
      if (f <= latest) errors.push(`${f}: must be newer than latest on ${base} (${latest}); rebase and rename`);
    if (added.length > 1) console.warn(`note: ${added.length} migrations in one PR (SOP-15 prefers one)`);
  } catch (e) {
    errors.push(`could not read base ${base}: ${e.message}`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`migrations ok (${files.length} files)`);
