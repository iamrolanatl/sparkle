/**
 * OcrResult hand-off contract (#54), mirrored verbatim from Team C's apps/api/src/vault/ocr.ts.
 * PROVISIONAL: replace this file with `import … from "../shared/ocr"` once Integration lands the shared contract.
 */
export interface OcrResult {
  engine: "on_device" | "workers_ai";
  text: string;
  /** 0..1 mean confidence */
  confidence: number;
  language?: string;
  pages?: number;
}

export function parseOcrResult(raw: unknown): OcrResult | null {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.engine !== "on_device" && o.engine !== "workers_ai") return null;
  if (typeof o.text !== "string" || o.text.length > 200_000) return null;
  if (typeof o.confidence !== "number" || !(o.confidence >= 0 && o.confidence <= 1)) return null;
  return {
    engine: o.engine,
    text: o.text,
    confidence: o.confidence,
    language: typeof o.language === "string" ? o.language.slice(0, 16) : undefined,
    pages: typeof o.pages === "number" ? o.pages : undefined,
  };
}
