/** FR-23 client helpers (pure). Mirrors the #54 OcrResult contract and the sensitive-class rule (DEC-124/127). */
export interface OcrResult {
  engine: "on_device" | "workers_ai";
  text: string;
  confidence: number;
  language?: string;
  pages?: number;
}

export const SENSITIVE =
  /\b(IEP|individuali[sz]ed education program|504 plan|section 504|immuni[sz]ation|medication|physician|diagnos\w*|evaluation report|psycho(?:logical|educational) evaluation)\b/i;

const MAX_EDGE = 2000;
export const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** Scale (w,h) to fit within `max` on the long edge; never upscales. */
export function fitWithin(w: number, h: number, max = MAX_EDGE): { w: number; h: number } {
  const s = Math.min(1, max / Math.max(w, h, 1));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/** Build the OcrResult from tesseract output (confidence 0..100 -> 0..1). */
export function toOcrResult(text: string, confidence0to100: number): OcrResult {
  const c = Number.isFinite(confidence0to100) ? Math.min(100, Math.max(0, confidence0to100)) / 100 : 0;
  return {
    engine: "on_device",
    text: text.slice(0, 200_000),
    confidence: Math.round(c * 1000) / 1000,
    language: "eng",
  };
}

export type Fields = {
  kind: "permission_slip" | "report_card" | "schedule" | "notice" | "other";
  title: string | null;
  school: string | null;
  studentName: string | null;
  dates: string[];
  dueDate: string | null;
  amounts: string[];
  signatureRequired: boolean;
};

export const KIND_LABELS: Record<Fields["kind"], string> = {
  permission_slip: "Permission slip",
  report_card: "Report card",
  schedule: "Schedule",
  notice: "Notice",
  other: "Other",
};

const ERRORS: Record<string, string> = {
  sensitive_use_vault: "This looks like an IEP, 504 or health document. Those belong in the vault, not here.",
  on_device_ocr_required: "We couldn't read any text. Try a sharper, well-lit photo.",
  unsupported_type: "Please use a JPEG, PNG or WebP image.",
  too_large: "That image is too large (10 MB max).",
  forbidden: "You don't have access to scan for this student.",
  unauthorized: "Please sign in again.",
};
export const errorMessage = (code: string | undefined) =>
  (code && ERRORS[code]) || "Something went wrong. Please try again.";
