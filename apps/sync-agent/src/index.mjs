#!/usr/bin/env node
/**
 * Sparkle laptop sync agent. Usage: node src/index.mjs --jobs grades,attendance,learn,parent,mail [--full]
 * - Attaches to the dedicated, already-signed-in Chrome over CDP (127.0.0.1:9333); exits quietly if Chrome isn't running.
 * - Read-only: page loads + the portals' own read calls. Never submits forms, never opens mail.
 * - Hashes every normalized record; uploads only changed records (delta) to POST {api}/ingest/:student/portal.
 * - Portal credentials/cookies never leave the laptop. Uploads use a per-student device token kept in Windows Credential Manager.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright-core";
import { pullSynergy } from "./synergy.mjs";
import { pullLearn } from "./learn.mjs";
import { pullParent } from "./parent.mjs";
import { pullOutlook } from "./outlook.mjs";
import { sha, sleep } from "./util.mjs";

const HOME = process.env.SPARKLE_SYNC_HOME ?? path.join(process.env.LOCALAPPDATA ?? ".", "SparkleSync");
const CDP = process.env.SPARKLE_CDP ?? "http://127.0.0.1:9333";
const args = process.argv.slice(2);
const jobs = new Set(
  (args.includes("--jobs") ? args[args.indexOf("--jobs") + 1] : "grades,attendance,learn,parent,mail").split(","),
);
const full = args.includes("--full");
const dry = args.includes("--dry");
const log = (o) => {
  const line = JSON.stringify({ t: new Date().toISOString(), ...o });
  fs.mkdirSync(path.join(HOME, "logs"), { recursive: true });
  fs.appendFileSync(path.join(HOME, "logs", `sync-${line.slice(7, 17)}.log`), line + "\n");
  console.log(line);
};
const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return d;
  }
};

/** Scoped device ingest token (sit_…) from Windows Credential Manager. Never logged, never written to disk. */
function deviceToken(cfg) {
  const r = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "cred.ps1"),
      "read",
      cfg.credentialTarget,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (r.status !== 0 || !r.stdout.startsWith("sit_"))
    throw Object.assign(new Error("ingest_token_missing"), { code: "no_credentials" });
  return r.stdout.trim();
}

async function upload(auth, batch) {
  const token = deviceToken(auth);
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${auth.apiBase}/ingest/${auth.studentId}/portal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (r.ok) return r.json();
    if (r.status < 500 && r.status !== 429) throw new Error(`upload_${r.status}:${(await r.text()).slice(0, 200)}`);
    await sleep([60, 240, 900][attempt] * 1000 * (process.env.FAST ? 0.01 : 1));
  }
  throw new Error("upload_retries_exhausted");
}

/** Ask the API to analyze new class-board posts (teacher post summaries) in ~20 s slices. Best-effort. */
async function analyze(auth) {
  const token = deviceToken(auth);
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${auth.apiBase}/ingest/${auth.studentId}/portal/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!r?.ok)
      return log({ msg: "analyze_skipped", status: r?.status ?? 0, detail: r ? (await r.text()).slice(0, 240) : null });
    const j = await r.json();
    log({ msg: "analyzed", analyzed: j.analyzed, ai: j.ai, remaining: j.remaining });
    if (!j.remaining) return;
  }
}

async function main() {
  const lockFile = path.join(HOME, "sync.lock");
  try {
    const st = fs.statSync(lockFile);
    if (Date.now() - st.mtimeMs < 20 * 60_000) return log({ msg: "skip_locked" });
  } catch {}
  fs.writeFileSync(lockFile, String(process.pid));
  try {
    try {
      const r = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) throw new Error();
    } catch {
      return log({ msg: "skip_no_chrome" });
    }
    const auth = readJson(path.join(HOME, "config.json"), null);
    if (!auth) return log({ msg: "no_config" });
    if (process.argv.includes("--analyze-only")) return await analyze(auth);
    const statePath = path.join(HOME, "state.json");
    const state = full
      ? { hashes: {}, classes: [], teachers: [] }
      : readJson(statePath, { hashes: {}, classes: [], teachers: [] });
    const browser = await chromium.connectOverCDP(CDP);
    const ctx = browser.contexts()[0];
    const sessions = [];
    const rec = {
      classes: [],
      aliases: [],
      teachers: [],
      terms: [],
      categories: [],
      assignments: [],
      snapshots: [],
      attendance: [],
      units: [],
      posts: [],
      messages: [],
      events: [],
      resources: [],
    };
    const add = (o) => {
      for (const k of Object.keys(rec)) if (o[k]) rec[k].push(...o[k]);
    };
    const sources = [];
    let classes = state.classes;
    let teachers = state.teachers ?? [];
    const run = async (source, fn) => {
      try {
        const r = await fn();
        sessions.push({ source, status: r.status, detail: r.detail ?? null });
        log({ msg: "pulled", source, status: r.status });
        if (r.status === "ok") {
          sources.push(source);
          add(r);
        }
        return r;
      } catch (e) {
        sessions.push({ source, status: "error", detail: String(e.message).slice(0, 120) });
        log({ msg: "pull_error", source, err: String(e.message).slice(0, 200) });
        return null;
      }
    };
    if (jobs.has("grades") || jobs.has("attendance") || !classes.length) {
      const sv = await run("studentvue", () => pullSynergy(ctx, { jobs }));
      if (sv?.status === "ok") {
        // carry over fields this run didn't pull (grades, syllabus/eBook) so partial jobs never blank them
        const prev = new Map((state.classes ?? []).map((c) => [c.key, c]));
        classes = sv.classes.map((c) => {
          const o = prev.get(c.key) ?? {};
          const out = { ...c };
          for (const f of ["mark", "pct", "missingCount", "syllabusUrl", "ebookUrl"])
            if (out[f] === undefined && o[f] !== undefined) out[f] = o[f];
          return out;
        });
        rec.classes = classes.map((c) => ({ ...c }));
        teachers = sv.teachers;
      }
    }
    if (classes.length && jobs.has("learn")) {
      const l = await run("ctls-learn", () => pullLearn(ctx, classes));
      if (l?.status === "ok")
        for (const [k, v] of Object.entries(l.classPatch)) Object.assign(classes.find((c) => c.key === k) ?? {}, v);
    }
    if (classes.length && jobs.has("parent")) await run("ctls-parent", () => pullParent(ctx, classes));
    if (classes.length && jobs.has("mail")) await run("outlook", () => pullOutlook(ctx, classes, teachers));
    if (!rec.classes.length && classes.length)
      rec.classes = classes.map((c) => ({ ...c })); // so learn patches (syllabus/eBook) are diffed
    else for (const c of rec.classes) Object.assign(c, classes.find((x) => x.key === c.key) ?? {});

    // delta by hash
    const batch = {
      studentId: auth.studentId,
      runKey: `run-${Date.now()}`,
      capturedAt: new Date().toISOString(),
      sources: [...new Set(sources)],
      sessions,
      hashes: [],
    };
    const newHashes = { ...state.hashes };
    let total = 0;
    for (const [entity, list] of Object.entries(rec)) {
      batch[entity] = [];
      for (const r of list) {
        const k = `${entity}|${r.externalId ?? r.key ?? `${r.classKey}|${r.name ?? r.day}`}`;
        const h = sha(r);
        total++;
        if (newHashes[k] === h) continue;
        newHashes[k] = h;
        batch[entity].push(r);
        batch.hashes.push({
          src: r.source ?? "studentvue",
          e: entity,
          k: k.slice(entity.length + 1, entity.length + 201),
          h,
        });
      }
    }
    if (sources.includes("studentvue") && jobs.has("attendance"))
      batch.attendanceKeys = rec.attendance.map((a) => a.externalId);
    const changed = batch.hashes.length;
    // class rows must be present whenever anything references a class not yet stored server-side
    if (changed && !batch.classes.length && !state.classes.length) batch.classes = classes;
    log({ msg: "delta", total, changed, sessions: sessions.map((s) => `${s.source}:${s.status}`).join(",") });
    if (dry) fs.writeFileSync(path.join(HOME, "batch-dry.json"), JSON.stringify(batch, null, 1));
    if (!dry && (changed || sessions.length || batch.attendanceKeys)) {
      const res = await upload(auth, batch);
      log({ msg: "uploaded", ...res });
      if (batch.posts?.length) await analyze(auth);
    }
    if (!dry)
      fs.writeFileSync(statePath, JSON.stringify({ hashes: newHashes, classes, teachers, at: batch.capturedAt }));
  } catch (e) {
    log({ msg: "fatal", err: String(e.message).slice(0, 300), code: e.code ?? null });
    process.exitCode = 1;
  } finally {
    fs.rmSync(lockFile, { force: true });
  }
}
main().then(() => process.exit()); // drop the CDP socket; never close Rolan's Chrome
