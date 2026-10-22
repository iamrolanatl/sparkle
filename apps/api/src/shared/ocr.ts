/**
 * Shared OCR contract (Integration-owned; #54, #72). Team B (scans, FR-23) and Team C (vault, FR-24) both import
 * from here. Change only via an `interface-change` issue + Integration review.
 * DEC-31: sensitive documents must be OCR'd on device. DEC-127: the server never OCRs.
 */
type OcrEngine = "on_device" | "workers_ai";
export type DocClass = "standard" | "academic" | "sensitive";

/** @public shared contract */
export interface OcrResult {
  engine: OcrEngine;
  text: string;
  /** 0..1 mean confidence */
  confidence: number;
  language?: string;
  pages?: number;
}

/** @public shared contract */
export const OCR_TEXT_MAX = 200_000;

/**
 * Sensitive-document terms (IEP/504/health/discipline/evaluations). Union of Team B's scan list and Team C's vault
 * list. Matching text is routed to the vault (guardian-only, on-device OCR) and never into general scans or AI.
 */
/** @public shared contract */
export const SENSITIVE_TERMS = [
  "IEP",
  "individuali[sz]ed education program",
  "504 plan",
  "section 504",
  "immuni[sz]ation",
  "medication",
  "physician",
  "diagnos\\w*",
  "evaluation report",
  "psycho(?:logical|educational) evaluation",
  "disciplin\\w*",
  "suspension",
] as const;
/** @public shared contract */
export const SENSITIVE_RE = new RegExp(`\\b(${SENSITIVE_TERMS.join("|")})\\b`, "i");

const ACADEMIC_RE =
  /\b(report card|progress report|transcript|test scores?|MAP growth|grade point|GPA|schedule|EOG|EOC|milestones)\b/i;

export const isSensitiveText = (text: string) => SENSITIVE_RE.test(text);

/** Suggest a document class from OCR text (uploader confirms; DEC-23). */
export function suggestClass(text: string): DocClass {
  if (SENSITIVE_RE.test(text)) return "sensitive";
  if (ACADEMIC_RE.test(text)) return "academic";
  return "standard";
}

/** Validate an untrusted OcrResult from a client. Returns an error code or null. */
export function validateOcrResult(input: unknown, cls?: DocClass): string | null {
  if (!input || typeof input !== "object") return "bad_ocr";
  const o = input as Partial<OcrResult>;
  if (o.engine !== "on_device" && o.engine !== "workers_ai") return "bad_engine";
  if (typeof o.text !== "string") return "bad_text";
  if (o.text.length > OCR_TEXT_MAX) return "ocr_text_too_large";
  if (typeof o.confidence !== "number" || !(o.confidence >= 0 && o.confidence <= 1)) return "bad_confidence";
  const sensitive = cls === "sensitive" || SENSITIVE_RE.test(o.text);
  if (sensitive && o.engine !== "on_device") return "sensitive_requires_on_device_ocr";
  return null;
}
