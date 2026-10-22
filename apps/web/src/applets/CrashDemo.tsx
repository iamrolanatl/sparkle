"use client";
/** Deliberately failing applet used by the /design showcase and E2E test to prove isolation (NFR-41). */
export default function CrashDemo(): never {
  throw new Error("CrashDemo applet failed on purpose");
}
