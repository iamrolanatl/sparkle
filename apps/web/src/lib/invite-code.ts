/** Invitation codes (FR-16, DEC-07): 12 chars from an unambiguous alphabet, shown as XXXX-XXXX-XXXX. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function generateInviteCode(
  rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  const out: string[] = [];
  // Rejection sampling keeps the distribution uniform.
  while (out.length < 12) {
    for (const b of rand(16)) {
      if (b < 248 && out.length < 12) out.push(ALPHABET[b % ALPHABET.length]!);
    }
  }
  return `${out.slice(0, 4).join("")}-${out.slice(4, 8).join("")}-${out.slice(8).join("")}`;
}

/** Same normalisation as public.redeem_invitation: sha256(upper(trim(code))) as hex. */
export async function hashInviteCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const RELATIONSHIPS = [
  "parent",
  "guardian",
  "sibling",
  "cousin",
  "aunt",
  "uncle",
  "grandparent",
  "babysitter",
  "tutor",
  "teacher",
  "other",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export function isRelationship(v: unknown): v is Relationship {
  return typeof v === "string" && (RELATIONSHIPS as readonly string[]).includes(v);
}
