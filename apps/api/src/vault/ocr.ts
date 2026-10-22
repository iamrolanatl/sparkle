/**
 * OCR contract shared with Team B's scan pipeline (FR-23) — see interface-change issue.
 * Producers (on-device OCR or Workers AI fallback) emit OcrResult; the vault consumes it.
 * DEC-31: sensitive class must come from on-device OCR only.
 */
type OcrEngine = "on_device" | "workers_ai";
export type VaultClass = "standard" | "academic" | "sensitive";

export interface OcrResult {
  engine: OcrEngine;
  text: string;
  /** 0..1 mean confidence */
  confidence: number;
  language?: string;
  pages?: number;
}

const SENSITIVE =
  /\b(IEP|individuali[sz]ed education program|504 plan|section 504|immuni[sz]ation|medication|physician|diagnos\w*|evaluation report|disciplin\w*|suspension)\b/i;
const ACADEMIC =
  /\b(report card|progress report|transcript|test scores?|MAP growth|grade point|GPA|schedule|EOG|EOC|milestones)\b/i;

/** Suggest a class from OCR text (uploader confirms; DEC-23). */
export function suggestClass(text: string): VaultClass {
  if (SENSITIVE.test(text)) return "sensitive";
  if (ACADEMIC.test(text)) return "academic";
  return "standard";
}

export function validateOcrForClass(ocr: OcrResult, cls: VaultClass): string | null {
  if (cls === "sensitive" && ocr.engine !== "on_device") return "sensitive_requires_on_device_ocr";
  if (!(ocr.confidence >= 0 && ocr.confidence <= 1)) return "bad_confidence";
  if (ocr.text.length > 200_000) return "ocr_text_too_large";
  return null;
}
