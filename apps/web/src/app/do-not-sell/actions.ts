"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/site";

export type PrivacyReqState = { status: "idle" | "ok" | "error"; message?: string };
const TYPES = ["do_not_sell_share", "access", "delete", "correct", "other"];

async function sha256Hex(v: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function submitPrivacyRequest(_p: PrivacyReqState, f: FormData): Promise<PrivacyReqState> {
  if (String(f.get("company") ?? "")) return { status: "ok", message: "Request received." };
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const type = String(f.get("request_type") ?? "do_not_sell_share");
  if (!isValidEmail(email) || !TYPES.includes(type)) return { status: "error", message: "Please check the form and try again." };
  const h = await headers();
  const gpc = h.get("sec-gpc") === "1" || f.get("gpc") === "1";
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Requests can't be saved right now. Please try again later." };
  const { error } = await supabase.from("privacy_requests").insert({
    request_type: type, email, details: String(f.get("details") ?? "").slice(0, 2000) || null,
    state_of_residence: String(f.get("state") ?? "").slice(0, 40) || null, gpc_signal: gpc, ip_hash: ip ? await sha256Hex(ip) : null,
  });
  if (error?.code === "P0429") return { status: "error", message: "Too many requests. Please try again later." };
  if (error) return { status: "error", message: "Something went wrong. Please try again." };
  return { status: "ok", message: "Request received. We'll confirm by email." };
}
