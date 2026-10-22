/** FR-23 pipeline: queue message -> redact -> sensitivity check -> extract -> status=review. Idempotent + retryable (DEC-121). */
import { redact } from "./redact";
import { extractFields } from "./extract";

export interface ScanJob {
  scanId: string;
  key: string; // R2 object key
}

export interface ScanRow {
  id: string;
  status: string;
  attempts: number;
  client_text: string | null;
}

export interface PipelineDeps {
  getScan(id: string): Promise<ScanRow | null>;
  /** Conditional update; returns false if the row was not in an expected state (lost race). */
  update(id: string, from: string[], patch: Record<string, unknown>): Promise<boolean>;
  deleteObject(key: string): Promise<void>;
  now?: () => Date;
}

export const MAX_ATTEMPTS = 3;
/** Sensitive-class signals (DEC-23/124). Kept in step with Team C's suggestClass (#54). */
export const SENSITIVE =
  /\b(IEP|individuali[sz]ed education program|504 plan|section 504|immuni[sz]ation|medication|physician|diagnos\w*|evaluation report|psycho(?:logical|educational) evaluation)\b/i;
const DONE = new Set(["review", "saved", "discarded", "failed"]);

/** Returns "skip" (already done / lost race), "ok", or "retry" (caller should re-deliver). */
export async function processScan(job: ScanJob, d: PipelineDeps): Promise<"skip" | "ok" | "retry"> {
  const row = await d.getScan(job.scanId);
  if (!row || DONE.has(row.status)) return "skip";
  const attempts = row.attempts + 1;
  if (!(await d.update(row.id, ["queued", "processing"], { status: "processing", attempts }))) return "skip";
  try {
    // DEC-127: on-device OCR only; the server never OCRs images.
    if (!row.client_text) throw new Error("no_ocr_text");
    const { text, counts } = redact(row.client_text);
    if (SENSITIVE.test(text)) {
      // DEC-124: sensitive docs belong in the vault; keep nothing here.
      await d.deleteObject(job.key);
      await d.update(row.id, ["processing"], {
        status: "discarded",
        client_text: null,
        ocr_text: null,
        fields: null,
        error: "sensitive_use_vault",
      });
      return "ok";
    }
    const fields = extractFields(text, (d.now?.() ?? new Date()).getUTCFullYear());
    await d.update(row.id, ["processing"], {
      status: "review",
      ocr_text: text,
      fields,
      redactions: counts,
      client_text: null, // never retain pre-pipeline text
      error: null,
    });
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "error";
    const final = attempts >= MAX_ATTEMPTS || msg === "no_ocr_text";
    await d.update(row.id, ["processing"], {
      status: final ? "failed" : "queued",
      error: msg,
      ...(final ? { client_text: null } : {}),
    });
    return final ? "skip" : "retry";
  }
}
