/** DEC-22 minimization: auto-redact SSN / card / bank numbers; warn on medical/legal records. */
export interface Minimized {
  text: string;
  redactions: { kind: "ssn" | "card" | "bank"; count: number }[];
  warnings: ("medical_record" | "legal_document")[];
}

function luhn(d: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function abaValid(r: string): boolean {
  const w = [3, 7, 1];
  let s = 0;
  for (let i = 0; i < 9; i++) s += (r.charCodeAt(i) - 48) * w[i % 3]!;
  return s % 10 === 0;
}

const SSN = /\b(?!000|666|9\d\d)(\d{3})[- ]?(?!00)(\d{2})[- ]?(?!0000)(\d{4})\b/g;
const CARD = /\b(?:\d[ -]?){13,19}\b/g;
const BANK = /\b(\d{9})\b[^\d\n]{0,20}\b(\d{6,17})\b/g;
const MEDICAL = /\b(ICD-?10|[A-TV-Z]\d{2}\.\d{1,4}|lab results?|clinical notes?|diagnosis:)\b/i;
const LEGAL = /\b(custody|court order|docket|plaintiff|defendant|parenting plan)\b/i;

export function minimize(input: string): Minimized {
  const counts = { ssn: 0, card: 0, bank: 0 };
  let text = input.replace(CARD, (m) => {
    const d = m.replace(/\D/g, "");
    if (d.length >= 13 && d.length <= 19 && luhn(d)) {
      counts.card++;
      return "[REDACTED-CARD]";
    }
    return m;
  });
  text = text.replace(BANK, (m, r: string) => {
    if (!abaValid(r)) return m;
    counts.bank++;
    return "[REDACTED-BANK]";
  });
  text = text.replace(SSN, () => {
    counts.ssn++;
    return "[REDACTED-SSN]";
  });
  const warnings: Minimized["warnings"] = [];
  if (MEDICAL.test(input)) warnings.push("medical_record");
  if (LEGAL.test(input)) warnings.push("legal_document");
  return {
    text,
    redactions: (Object.keys(counts) as (keyof typeof counts)[])
      .filter((k) => counts[k] > 0)
      .map((kind) => ({ kind, count: counts[kind] })),
    warnings,
  };
}
