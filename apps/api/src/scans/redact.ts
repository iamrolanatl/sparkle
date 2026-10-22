/** FR-23 / DEC-22: auto-redact SSNs, bank/card numbers before anything is stored or shown. Pure + testable. */
export interface RedactResult {
  text: string;
  counts: { ssn: number; card: number; bank: number };
}

const luhn = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

const SSN = /\b(?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g;
const CARD = /\b(?:\d[ -]?){13,19}\b/g;
// Bank account/routing numbers: 8-17 digits near a banking keyword.
const BANK = /\b(account|acct|routing|aba|iban|bank)\b([^\d\n]{0,20})(\d[\d -]{6,20}\d)/gi;

export function redact(input: string): RedactResult {
  const counts = { ssn: 0, card: 0, bank: 0 };
  let text = input.replace(BANK, (_m, kw: string, sep: string, num: string) => {
    const d = num.replace(/\D/g, "");
    if (d.length < 8 || d.length > 17) return _m;
    counts.bank++;
    return `${kw}${sep}[REDACTED-BANK •••${d.slice(-4)}]`;
  });
  text = text.replace(CARD, (m) => {
    const d = m.replace(/\D/g, "");
    if (d.length < 13 || !luhn(d)) return m;
    counts.card++;
    return `[REDACTED-CARD •••${d.slice(-4)}]`;
  });
  text = text.replace(SSN, () => {
    counts.ssn++;
    return "[REDACTED-SSN]";
  });
  return { text, counts };
}
