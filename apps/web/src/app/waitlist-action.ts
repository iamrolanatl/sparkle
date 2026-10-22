"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/site";

export type WaitlistState = { status: "idle" | "ok" | "error"; message?: string };

async function sha256Hex(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  // Honeypot: real people never fill this hidden field.
  if (String(form.get("company") ?? "").trim() !== "") return { status: "ok", message: "Thanks! You're on the list." };
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(form.get("role") ?? "other");
  if (!isValidEmail(email)) return { status: "error", message: "Please enter a valid email." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "The waitlist isn't open yet. Please check back soon." };
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const { error } = await supabase.from("waitlist").insert({
    email,
    role_hint: ["parent", "student", "educator", "other"].includes(role) ? role : "other",
    source: "landing",
    ip_hash: ip ? await sha256Hex(ip) : null,
  });
  if (error && error.code === "P0429")
    return { status: "error", message: "Too many tries. Please wait a bit and try again." };
  if (error && error.code !== "23505") return { status: "error", message: "Something went wrong. Please try again." };
  return { status: "ok", message: "Thanks! You're on the list. We'll email you when Sparkle is ready." };
}
