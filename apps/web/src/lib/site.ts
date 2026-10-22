/** Public site URL (production domain TBD — see WBS 2.8). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sparkle.example").replace(/\/$/, "");

export function isValidEmail(v: string): boolean {
  return v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}
