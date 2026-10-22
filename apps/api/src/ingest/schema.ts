/**
 * Desktop-agent sync batch contract (TDD §8.7, WBS 3.1/3.2). Pure + testable.
 * The agent sends only normalized school data. Credentials, cookies and session tokens never leave the
 * device (DEC-160); any credential-shaped key anywhere in the payload is rejected outright.
 */
const INGEST_SOURCES = ["mock-portal"] as const; // real portals are added only after a terms review (SA-D1)
type IngestSource = (typeof INGEST_SOURCES)[number];
const STATUSES = new Set(["assigned", "submitted", "missing", "late", "graded", "excused"]);
const MAX_CLASSES = 50;
const MAX_ASSIGNMENTS = 5000;
/** Matched against the snake_cased key, so `author`, `authorName`, `sessionNumber` pass; `accessToken`, `sessionCookie` don't. */
const FORBIDDEN_KEY =
  /^(.*_)?(password|passwd|passcode|pwd|secret|token|cookie|cookies|session|session_?id|credentials?|auth|authorization|api_?key|private_?key)$/;
const snake = (k: string) =>
  k
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s.]+/g, "_")
    .toLowerCase();

interface IngestClass {
  externalId: string;
  name: string;
  teacher: string | null;
  period: string | null;
}
interface IngestAssignment {
  externalId: string;
  classExternalId: string | null;
  title: string;
  dueAt: string | null;
  status: string | null;
  score: number | null;
  maxScore: number | null;
}
export interface SyncBatch {
  studentId: string;
  source: IngestSource;
  runKey: string;
  capturedAt: string;
  classes: IngestClass[];
  assignments: IngestAssignment[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID = /^[\w.:-]{1,128}$/;

function findForbiddenKey(v: unknown, depth = 0): string | null {
  if (depth > 6 || v === null || typeof v !== "object") return null;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(snake(k))) return k;
    const inner = findForbiddenKey(x, depth + 1);
    if (inner) return inner;
  }
  return null;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const numOrNull = (v: unknown) =>
  v === null || v === undefined ? null : typeof v === "number" && Number.isFinite(v) ? v : NaN;
const isoOrNull = (v: unknown) => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return NaN;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? NaN : d.toISOString();
};

export function validateBatch(input: unknown, studentId: string): { batch?: SyncBatch; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { errors: ["Body must be a JSON object."] };
  const bad = findForbiddenKey(input);
  if (bad) return { errors: [`Credential-like field "${bad}" is not allowed; credentials stay on the device.`] };
  const b = input as Record<string, unknown>;
  if (b.studentId !== studentId || !UUID.test(studentId)) errors.push("studentId must match the URL.");
  if (!INGEST_SOURCES.includes(b.source as IngestSource)) errors.push(`Unsupported source "${String(b.source)}".`);
  if (typeof b.runKey !== "string" || !ID.test(b.runKey)) errors.push("runKey is required (1-128 safe chars).");
  const capturedAt = isoOrNull(b.capturedAt);
  if (typeof capturedAt !== "string") errors.push("capturedAt must be an ISO timestamp.");
  if (!Array.isArray(b.classes) || !Array.isArray(b.assignments))
    errors.push("classes and assignments must be arrays.");
  if (errors.length) return { errors };
  const rawC = b.classes as unknown[];
  const rawA = b.assignments as unknown[];
  if (rawC.length > MAX_CLASSES || rawA.length > MAX_ASSIGNMENTS) return { errors: ["Batch too large."] };

  const classes: IngestClass[] = [];
  const classIds = new Set<string>();
  rawC.forEach((c, i) => {
    const o = (c ?? {}) as Record<string, unknown>;
    const externalId = typeof o.externalId === "string" && ID.test(o.externalId) ? o.externalId : null;
    const name = str(o.name, 120);
    if (!externalId || !name) return void errors.push(`classes[${i}]: externalId and name are required.`);
    if (classIds.has(externalId)) return void errors.push(`classes[${i}]: duplicate externalId.`);
    classIds.add(externalId);
    classes.push({ externalId, name, teacher: str(o.teacher, 120), period: str(o.period, 20) });
  });
  const assignments: IngestAssignment[] = [];
  rawA.forEach((a, i) => {
    const o = (a ?? {}) as Record<string, unknown>;
    const externalId = typeof o.externalId === "string" && ID.test(o.externalId) ? o.externalId : null;
    const title = str(o.title, 200);
    if (!externalId || !title) return void errors.push(`assignments[${i}]: externalId and title are required.`);
    const classExternalId = typeof o.classExternalId === "string" ? o.classExternalId : null;
    if (classExternalId && !classIds.has(classExternalId)) return void errors.push(`assignments[${i}]: unknown class.`);
    const dueAt = isoOrNull(o.dueAt);
    if (Number.isNaN(dueAt)) return void errors.push(`assignments[${i}]: bad dueAt.`);
    const status = typeof o.status === "string" ? o.status.toLowerCase() : null;
    if (status && !STATUSES.has(status)) return void errors.push(`assignments[${i}]: unknown status "${status}".`);
    const score = numOrNull(o.score);
    const maxScore = numOrNull(o.maxScore);
    if (Number.isNaN(score) || Number.isNaN(maxScore))
      return void errors.push(`assignments[${i}]: score must be a number.`);
    assignments.push({ externalId, classExternalId, title, dueAt: dueAt as string | null, status, score, maxScore });
  });
  if (errors.length) return { errors: errors.slice(0, 20) };
  return {
    batch: {
      studentId,
      source: b.source as IngestSource,
      runKey: b.runKey as string,
      capturedAt: capturedAt as string,
      classes,
      assignments,
    },
    errors: [],
  };
}
