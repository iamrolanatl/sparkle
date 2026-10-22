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
// Access-widening changes need explicit Integration sign-off + RLS tests (Team E review of #28).
const SIGNOFF = /--\s*integration-signoff:\s*\S+/i;
const ACCESS_FNS = ["can_view_student", "redeem_invitation", "is_active_guardian", "is_student_self", "student_age"];
const ACCESS_RULES = [
  [
    new RegExp(`\\bcreate\\s+or\\s+replace\\s+function\\s+(public\\.)?(${ACCESS_FNS.join("|")})\\b`, "i"),
    "CREATE OR REPLACE on an access function",
  ],
  [/\balter\s+policy\b/i, "ALTER POLICY"],
  [/\bsecurity\s+definer\b/i, "SECURITY DEFINER function"],
];
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
// Function/DO bodies run at call time, not migration time: blank out dollar-quoted blocks ($$…$$, $tag$…$tag$)
// for the destructive check only. Top-level statements are still checked.
const stripBodies = (sql) => sql.replace(/(\$[A-Za-z_]*\$)[\s\S]*?\1/g, "$$$$");
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
  const rb = /--\s*rollback:[ \t]*(.*)/i.exec(raw);
  if (!rb) errors.push(`${f}: missing "-- rollback:" note`);
  else if (rb[1].trim().length < 5 || /^(n\/?a|none|tbd|-)$/i.test(rb[1].trim()))
    errors.push(`${f}: "-- rollback:" note must describe the rollback (not blank / n/a)`);
  if (!OVERRIDE.test(raw)) {
    // Allow `drop policy if exists X on T;` when the same policy X on T is re-created in this file.
    const full = stripBodies(stripComments(raw));
    const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sql = full.replace(
      /\bdrop\s+policy\s+if\s+exists\s+("[^"]+"|\w+)\s+on\s+([\w."]+)\s*;/gi,
      (m, name, table) =>
        new RegExp(`\\bcreate\\s+policy\\s+${esc(name)}\\s+on\\s+${esc(table)}`, "i").test(full) ? ";" : m,
    );
    for (const [re, label] of RULES)
      if (re.test(sql)) errors.push(`${f}: ${label} not allowed (additive only; needs "-- destructive-ok: CR-xxxx")`);
  }
  if (!SIGNOFF.test(raw)) {
    const sql = stripComments(raw);
    for (const [re, label] of ACCESS_RULES)
      if (re.test(sql))
        errors.push(
          `${f}: ${label} can widen access — needs "-- integration-signoff: <PR#>" and RLS tests (SOP-15 §1.6)`,
        );
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
