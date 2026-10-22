import { serviceRest } from "../lib/supa";
import { findForbiddenKey } from "./schema";

/**
 * School-portal delta batch from the laptop sync agent (apps/sync-agent). Only CHANGED records are sent
 * (agent-side sha256 per record). Classes are referenced by the agent's canonical key (section number).
 * Credentials/cookies never leave the laptop: credential-shaped keys anywhere → rejected.
 */
const SOURCES = new Set(["studentvue", "parentvue", "ctls-learn", "ctls-parent", "outlook"]);
const ID = /^[\w.:@/-]{1,200}$/;
const MAX = 5000;
const s = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const iso = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const url = (v: unknown) => (typeof v === "string" && /^https?:\/\//i.test(v) && v.length <= 2000 ? v : null);
const b = (v: unknown) => (typeof v === "boolean" ? v : null);
type R = Record<string, unknown>;
const arr = (v: unknown): R[] => (Array.isArray(v) ? (v.slice(0, MAX) as R[]) : []);

export interface PortalBatch {
  studentId: string;
  runKey: string;
  capturedAt: string;
  sources: string[];
  classes: R[];
  aliases: R[];
  teachers: R[];
  terms: R[];
  categories: R[];
  assignments: R[];
  snapshots: R[];
  attendance: R[];
  units: R[];
  posts: R[];
  messages: R[];
  events: R[];
  resources: R[];
  sessions: R[];
  hashes: R[];
  /** Full current set of attendance keys (sent when attendance was pulled): portal is the source of truth. */
  attendanceKeys: string[] | null;
}

export function validatePortalBatch(input: unknown, studentId: string): { batch?: PortalBatch; error?: string } {
  if (!input || typeof input !== "object") return { error: "Body must be a JSON object." };
  const bad = findForbiddenKey(input);
  if (bad) return { error: `Credential-like field "${bad}" is not allowed.` };
  const o = input as R;
  if (o.studentId !== studentId) return { error: "studentId must match the URL." };
  if (typeof o.runKey !== "string" || !/^[\w.:-]{1,128}$/.test(o.runKey)) return { error: "runKey required." };
  const capturedAt = iso(o.capturedAt);
  if (!capturedAt) return { error: "capturedAt must be ISO." };
  const sources = arr(o.sources) as unknown as string[];
  if (sources.some((x) => !SOURCES.has(x))) return { error: "Unsupported source." };
  const keyed = (list: R[], k = "externalId") =>
    list.filter((x) => x && typeof x[k] === "string" && ID.test(x[k] as string));
  return {
    batch: {
      studentId,
      runKey: o.runKey,
      capturedAt,
      sources,
      classes: keyed(arr(o.classes), "key"),
      aliases: keyed(arr(o.aliases)),
      teachers: keyed(arr(o.teachers)),
      terms: keyed(arr(o.terms)),
      categories: arr(o.categories).filter((x) => x && typeof x.classKey === "string" && s(x.name, 60)),
      assignments: keyed(arr(o.assignments)),
      snapshots: arr(o.snapshots).filter((x) => x && typeof x.classKey === "string" && day(x.day)),
      attendance: keyed(arr(o.attendance)),
      units: keyed(arr(o.units)),
      posts: keyed(arr(o.posts)),
      messages: keyed(arr(o.messages)),
      events: keyed(arr(o.events)),
      resources: keyed(arr(o.resources)),
      sessions: arr(o.sessions).filter((x) => x && SOURCES.has(x.source as string)),
      attendanceKeys: Array.isArray(o.attendanceKeys)
        ? (o.attendanceKeys as unknown[]).filter((k): k is string => typeof k === "string" && ID.test(k)).slice(0, MAX)
        : null,
      hashes: arr(o.hashes).filter((x) => x && typeof x.h === "string" && /^[0-9a-f]{64}$/.test(x.h as string)),
    },
  };
}

type Env = { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string; TODAY_CACHE?: KVNamespace };

export async function writePortalBatch(
  env: Env,
  batch: PortalBatch,
  actor: "guardian" | "student",
  rest = serviceRest(env),
) {
  const sid = batch.studentId;
  const up = async <T = unknown>(table: string, conflict: string, rows: R[], ret = false): Promise<T[]> => {
    const out: T[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const r = await rest<T[]>(`${table}?on_conflict=${conflict}${ret ? "&select=id,external_key" : ""}`, {
        method: "POST",
        prefer: `${ret ? "return=representation" : "return=minimal"},resolution=merge-duplicates`,
        body: JSON.stringify(rows.slice(i, i + 500)),
      });
      if (ret && r) out.push(...r);
    }
    return out;
  };
  const [run] = await rest<{ id: string }[]>("sync_runs", {
    method: "POST",
    body: JSON.stringify({
      student_id: sid,
      source: "school-portals",
      actor,
      status: "running",
      source_detail: batch.sources.join(","),
    }),
  });
  let changed = 0;
  try {
    const termId = new Map<string, string>();
    for (const r of await up<{ id: string; external_key: string }>(
      "terms",
      "student_id,external_key",
      batch.terms.map((t) => ({
        student_id: sid,
        external_key: t.externalId,
        school_year: s(t.schoolYear, 20) ?? "",
        name: s(t.name, 40) ?? "",
        start_date: day(t.start),
        end_date: day(t.end),
      })),
      true,
    ))
      termId.set(r.external_key, r.id);
    const teacherId = new Map<string, string>();
    for (const r of await up<{ id: string; external_key: string }>(
      "teachers",
      "student_id,external_key",
      batch.teachers.map((t) => ({
        student_id: sid,
        external_key: t.externalId,
        name: s(t.name, 120) ?? "",
        email: s(t.email, 200),
        aliases: arr(t.aliases).map((x) => String(x).slice(0, 120)),
      })),
      true,
    ))
      teacherId.set(r.external_key, r.id);
    // classes: on a delta run unchanged classes are absent, so resolve keys against what is already stored.
    const classId = new Map<string, string>();
    if (batch.classes.length)
      for (const r of await up<{ id: string; external_key: string }>(
        "classes",
        "student_id,external_key",
        batch.classes.map((c) => ({
          student_id: sid,
          external_key: `portal:${c.key}`,
          source: "school-portals",
          name: s(c.name, 120) ?? "Class",
          teacher: s(c.teacher, 120),
          period: s(c.period, 20),
          room: s(c.room, 40),
          course_code: s(c.courseCode, 40),
          section_no: s(c.sectionNo, 20),
          term_id: termId.get(String(c.termKey)) ?? null,
          teacher_id: teacherId.get(String(c.teacherKey)) ?? null,
          mark: s(c.mark, 20),
          pct: n(c.pct),
          missing_count: n(c.missingCount),
          syllabus_url: url(c.syllabusUrl),
          ebook_url: url(c.ebookUrl),
          synced_at: batch.capturedAt,
        })),
        true,
      ))
        classId.set(r.external_key.slice(7), r.id);
    const stored = await rest<{ id: string; external_key: string }[]>(
      `classes?student_id=eq.${sid}&external_key=like.portal:*&select=id,external_key`,
    );
    for (const r of stored ?? []) if (!classId.has(r.external_key.slice(7))) classId.set(r.external_key.slice(7), r.id);
    const cid = (k: unknown) => (typeof k === "string" ? (classId.get(k) ?? null) : null);

    await up(
      "class_aliases",
      "student_id,source,external_id",
      batch.aliases
        .filter((a) => cid(a.classKey))
        .map((a) => ({
          student_id: sid,
          class_id: cid(a.classKey),
          source: s(a.source, 30),
          external_id: a.externalId,
          label: s(a.label, 200),
        })),
    );
    const cats = batch.categories.filter((x) => cid(x.classKey));
    await up(
      "class_categories",
      "class_id,name",
      cats.map((x) => ({
        student_id: sid,
        class_id: cid(x.classKey),
        name: s(x.name, 60),
        weight: Math.min(100, Math.max(0, n(x.weight) ?? 0)),
        score: n(x.score),
        drop_scores: n(x.dropScores),
        source: "studentvue",
      })),
    );
    const units = await up<{ id: string; external_key: string }>(
      "units",
      "student_id,external_key",
      batch.units
        .filter((u) => cid(u.classKey))
        .map((u) => ({
          student_id: sid,
          class_id: cid(u.classKey),
          external_key: u.externalId,
          title: s(u.title, 200) ?? "Unit",
          topics: arr(u.topics)
            .map((x) => String(x).slice(0, 80))
            .slice(0, 12),
          week_label: s(u.weekLabel, 80),
          is_current: u.isCurrent === true,
          start_date: day(u.start),
          end_date: day(u.end),
          source: s(u.source, 30),
        })),
      true,
    );
    // only one current unit per class
    for (const u of batch.units.filter((x) => x.isCurrent === true && cid(x.classKey))) {
      const keep = units.find((r) => r.external_key === u.externalId);
      if (keep)
        await rest(`units?class_id=eq.${cid(u.classKey)}&id=neq.${keep.id}&is_current=is.true`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ is_current: false }),
        });
    }
    const asg = batch.assignments.map((a) => ({
      student_id: sid,
      class_id: cid(a.classKey),
      external_key: `portal:${a.externalId}`,
      title: s(a.title, 200) ?? "Assignment",
      due_at: iso(a.dueAt),
      status: s(a.status, 20),
      category: s(a.category, 60),
      points_possible: n(a.maxScore),
      is_missing: a.isMissing === true,
      teacher_comment: s(a.comment, 500),
      score_pct: n(a.pct),
      source: s(a.source, 30),
      entered_by: actor,
    }));
    const aRows = await up<{ id: string; external_key: string }>("assignments", "student_id,external_key", asg, true);
    const aId = new Map(aRows.map((r) => [r.external_key, r.id]));
    await up(
      "grades",
      "student_id,external_key",
      batch.assignments
        .filter((a) => n(a.score) !== null)
        .map((a) => ({
          student_id: sid,
          class_id: cid(a.classKey),
          assignment_id: aId.get(`portal:${a.externalId}`) ?? null,
          external_key: `portal:${a.externalId}`,
          score: n(a.score),
          max_score: n(a.maxScore),
          source: s(a.source, 30),
          entered_by: actor,
        })),
    );
    await up(
      "grade_snapshots",
      "class_id,captured_on",
      batch.snapshots
        .filter((x) => cid(x.classKey))
        .map((x) => ({
          student_id: sid,
          class_id: cid(x.classKey),
          captured_on: x.day,
          pct: n(x.pct),
          mark: s(x.mark, 20),
          missing_count: n(x.missingCount),
        })),
    );
    await up(
      "attendance_events",
      "student_id,external_key",
      batch.attendance
        .filter((x) => day(x.day))
        .map((x) => ({
          student_id: sid,
          class_id: cid(x.classKey),
          external_key: x.externalId,
          day: x.day,
          period: s(x.period, 20),
          course_name: s(x.courseName, 120),
          code: s(x.code, 40) ?? "absent",
          reason: s(x.reason, 200),
          excused: b(x.excused),
          source: s(x.source, 30) ?? "studentvue",
        })),
    );
    if (batch.attendanceKeys) {
      // reconcile: drop StudentVUE attendance rows the portal no longer lists (corrections, mis-parses)
      const have = await rest<{ id: string; external_key: string }[]>(
        `attendance_events?student_id=eq.${sid}&source=eq.studentvue&select=id,external_key`,
      );
      const keep = new Set(batch.attendanceKeys);
      const gone = (have ?? []).filter((r) => !keep.has(r.external_key)).map((r) => r.id);
      for (let i = 0; i < gone.length; i += 100)
        await rest(`attendance_events?id=in.(${gone.slice(i, i + 100).join(",")})`, {
          method: "DELETE",
          prefer: "return=minimal",
        });
    }
    await up(
      "posts",
      "student_id,external_key",
      batch.posts.map((x) => ({
        student_id: sid,
        class_id: cid(x.classKey),
        external_key: x.externalId,
        source: s(x.source, 30) ?? "ctls",
        author: s(x.author, 120),
        title: s(x.title, 300) ?? "Post",
        body: s(x.body, 4000),
        url: url(x.url),
        posted_at: iso(x.postedAt),
      })),
    );
    await up(
      "messages",
      "student_id,external_key",
      batch.messages.map((x) => ({
        student_id: sid,
        class_id: cid(x.classKey),
        external_key: x.externalId,
        source: s(x.source, 30) ?? "outlook",
        sender: s(x.sender, 120),
        is_teacher: x.isTeacher === true,
        subject: s(x.subject, 300) ?? "(no subject)",
        snippet: s(x.snippet, 500),
        received_at: iso(x.receivedAt),
      })),
    );
    await up(
      "calendar_events",
      "student_id,external_key",
      batch.events
        .filter((x) => iso(x.startsAt))
        .map((x) => ({
          student_id: sid,
          class_id: cid(x.classKey),
          external_key: x.externalId,
          source: s(x.source, 30) ?? "ctls-parent",
          kind: s(x.kind, 30),
          title: s(x.title, 300) ?? "Event",
          starts_at: iso(x.startsAt),
          ends_at: iso(x.endsAt),
        })),
    );
    await up(
      "resources",
      "student_id,external_key",
      batch.resources
        .filter((x) => url(x.url))
        .map((x) => ({
          student_id: sid,
          class_id: cid(x.classKey),
          external_key: x.externalId,
          kind: ["link", "ebook", "syllabus", "file"].includes(x.kind as string) ? x.kind : "link",
          provider: s(x.provider, 40),
          title: s(x.title, 300) ?? "Link",
          url: url(x.url),
          source: s(x.source, 30) ?? "ctls-learn",
        })),
    );
    for (const ok of [true, false]) {
      await up(
        "portal_sessions",
        "student_id,source",
        batch.sessions
          .filter((x) => (x.status === "ok") === ok)
          .map((x) => ({
            student_id: sid,
            source: x.source,
            status: ["ok", "needs_login", "error", "skipped"].includes(x.status as string) ? x.status : "error",
            detail: s(x.detail, 200),
            checked_at: batch.capturedAt,
            ...(ok ? { last_ok_at: batch.capturedAt } : {}),
          })),
      );
    }
    await up(
      "source_records",
      "student_id,source,entity,external_key",
      batch.hashes
        .filter((x) => typeof x.k === "string")
        .map((x) => ({
          student_id: sid,
          source: s(x.src, 30),
          entity: s(x.e, 30),
          external_key: String(x.k).slice(0, 200),
          payload_hash: x.h,
          last_seen: batch.capturedAt,
        })),
    );
    changed = batch.hashes.length;
    await rest(`sync_runs?id=eq.${run!.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        status: "ok",
        rows_ok: asg.length,
        rows_changed: changed,
        finished_at: new Date().toISOString(),
      }),
    });
    await env.TODAY_CACHE?.delete(`today:${sid}`);
    return { changed };
  } catch (e) {
    await rest(`sync_runs?id=eq.${run!.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "error", error_class: "ingest_write", finished_at: new Date().toISOString() }),
    }).catch(() => {});
    throw e;
  }
}
