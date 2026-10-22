import { serviceRest } from "../lib/supa";
import type { SyncBatch } from "./schema";

/** Who uploaded the batch (DEC-166). Student-uploaded rows are labelled so guardian views can show provenance. */
type EnteredBy = "guardian" | "student";
export interface IngestJob {
  batch: SyncBatch;
  enteredBy: EnteredBy;
}

/**
 * Service-role ingest writer (TDD §8.1: school data is written only by the ingest worker).
 * Idempotent: upserts on (student_id, external_key) with source-namespaced keys, chunked at 500 rows.
 * Scores are persisted to `grades` (one row per graded assignment) so they reach the GPA engine.
 */
export async function writeBatch(
  env: { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string; TODAY_CACHE?: KVNamespace },
  { batch, enteredBy }: IngestJob,
  rest = serviceRest(env),
): Promise<{ classes: number; assignments: number; grades: number }> {
  const sid = batch.studentId;
  const source = batch.source;
  const ns = (id: string) => `${source}:${id}`;
  const prov = { source, entered_by: enteredBy };
  const [run] = await rest<{ id: string }[]>("sync_runs", {
    method: "POST",
    body: JSON.stringify({
      student_id: sid,
      source,
      actor: enteredBy,
      status: "running",
      rows_in: batch.assignments.length,
    }),
  });
  try {
    const classId = new Map<string, string>();
    if (batch.classes.length) {
      const rows = await rest<{ id: string; external_key: string }[]>("classes?on_conflict=student_id,external_key", {
        method: "POST",
        prefer: "return=representation,resolution=merge-duplicates",
        body: JSON.stringify(
          batch.classes.map((c) => ({
            student_id: sid,
            external_key: ns(c.externalId),
            name: c.name,
            teacher: c.teacher,
            period: c.period,
            source,
          })),
        ),
      });
      for (const r of rows) classId.set(r.external_key, r.id);
    }
    const assignments = batch.assignments.map((a) => ({
      student_id: sid,
      class_id: a.classExternalId ? (classId.get(ns(a.classExternalId)) ?? null) : null,
      external_key: ns(a.externalId),
      title: a.title,
      due_at: a.dueAt,
      status: a.status,
      points_possible: a.maxScore,
      ...prov,
    }));
    const assignmentId = new Map<string, string>();
    for (let i = 0; i < assignments.length; i += 500) {
      const rows = await rest<{ id: string; external_key: string }[]>(
        "assignments?on_conflict=student_id,external_key&select=id,external_key",
        {
          method: "POST",
          prefer: "return=representation,resolution=merge-duplicates",
          body: JSON.stringify(assignments.slice(i, i + 500)),
        },
      );
      for (const r of rows ?? []) assignmentId.set(r.external_key, r.id);
    }
    const grades = batch.assignments
      .filter((a) => a.score !== null)
      .map((a) => ({
        student_id: sid,
        class_id: a.classExternalId ? (classId.get(ns(a.classExternalId)) ?? null) : null,
        assignment_id: assignmentId.get(ns(a.externalId)) ?? null,
        external_key: ns(a.externalId),
        score: a.score,
        max_score: a.maxScore,
        ...prov,
      }));
    for (let i = 0; i < grades.length; i += 500) {
      await rest("grades?on_conflict=student_id,external_key", {
        method: "POST",
        prefer: "return=minimal,resolution=merge-duplicates",
        body: JSON.stringify(grades.slice(i, i + 500)),
      });
    }
    await rest(`sync_runs?id=eq.${run!.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "ok", rows_ok: assignments.length, finished_at: new Date().toISOString() }),
    });
    await env.TODAY_CACHE?.delete(`today:${sid}`);
    return { classes: batch.classes.length, assignments: assignments.length, grades: grades.length };
  } catch (e) {
    await rest(`sync_runs?id=eq.${run!.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "error", error_class: "ingest_write", finished_at: new Date().toISOString() }),
    }).catch(() => {});
    throw e;
  }
}
