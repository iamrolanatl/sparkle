import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadClasses, loadStudents } from "@/lib/classes/load";

/**
 * Per-request memoized data access (React cache). The layout and the page render in the same request,
 * so the Supabase client, the signed-in user, the student list and a student's classes are fetched once
 * per request instead of 2–3 times. Nothing is shared across requests or users; RLS still applies.
 */
export const getSb = cache(createClient);

/** Verified user. getClaims() verifies the JWT locally (cached JWKS) and only falls back to a network
 *  Auth call when needed, so it is much cheaper than getUser() on every render. */
export const getUser = cache(async (): Promise<User | null> => {
  const sb = await getSb();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getClaims();
    const c = data?.claims as Record<string, unknown> | undefined;
    if (!error && c?.sub) {
      return {
        id: c.sub as string,
        email: (c.email as string) ?? undefined,
        phone: (c.phone as string) ?? undefined,
        aud: (c.aud as string) ?? "authenticated",
        role: (c.role as string) ?? undefined,
        app_metadata: (c.app_metadata as User["app_metadata"]) ?? {},
        user_metadata: (c.user_metadata as User["user_metadata"]) ?? {},
        created_at: "",
      } as User;
    }
  } catch {}
  return (await sb.auth.getUser()).data.user;
});

export const getStudents = cache(async () => {
  const sb = await getSb();
  const u = await getUser();
  return sb ? loadStudents(sb, u?.id) : [];
});

export const getClasses = cache(async (studentId: string) => {
  const sb = await getSb();
  return sb ? loadClasses(sb, studentId) : [];
});
