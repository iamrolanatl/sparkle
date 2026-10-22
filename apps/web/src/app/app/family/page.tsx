import { NeonWindow } from "@sparkle/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { approveInvitation, revokeInvitation, revokeShare } from "./actions";
import { AddStudentForm, InviteForm } from "./forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Family & helpers", robots: { index: false } };

type Student = { id: string; display_name: string; birth_date: string | null; profile_id: string | null };
type Invite = {
  id: string;
  student_id: string;
  role: string;
  relationship: string | null;
  relationship_label: string | null;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  requires_approval: boolean;
  approved_at: string | null;
};
type Share = {
  id: string;
  student_id: string;
  relationship: string;
  relationship_label: string | null;
  scopes: string[];
  revoked_at: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export default async function FamilyPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/app/family");

  // RLS decides what each person can see (TDD §8). Bounded queries (NFR-43).
  const [{ data: students }, { data: invites }, { data: shares }] = await Promise.all([
    supabase.from("students").select("id, display_name, birth_date, profile_id").order("created_at").limit(50),
    supabase
      .from("invitations")
      .select(
        "id, student_id, role, relationship, relationship_label, email, expires_at, accepted_at, revoked_at, requires_approval, approved_at",
      )
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", nowIso())
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("shares")
      .select("id, student_id, relationship, relationship_label, scopes, revoked_at")
      .is("revoked_at", null)
      .limit(200),
  ]);

  return (
    <div className="page stack">
      <div className="phead">
        <div>
          <h1>Family &amp; helpers</h1>
          <div className="sub">Students, the people who can see them, and invitations</div>
        </div>
        <Link href="/invite" className="ghost">
          Have a code?
        </Link>
      </div>
      <NeonWindow title="Add a student">
        <AddStudentForm />
      </NeonWindow>
      {((students ?? []) as Student[]).map((s) => {
        const sInv = ((invites ?? []) as Invite[]).filter((i) => i.student_id === s.id);
        const sShares = ((shares ?? []) as Share[]).filter((x) => x.student_id === s.id);
        return (
          <NeonWindow key={s.id} title={s.display_name}>
            <p className="text-muted text-sm">
              {s.profile_id ? "Has their own login." : "No student login yet — invite them below."}
            </p>
            <h3 className="mt-4 font-semibold">People who can see {s.display_name}</h3>
            <ul className="mt-2 grid gap-2">
              {sShares.length === 0 ? <li className="text-muted text-sm">No helpers yet.</li> : null}
              {sShares.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {x.relationship_label ?? x.relationship} · {x.scopes.join(", ")}
                  </span>
                  <form action={revokeShare}>
                    <input type="hidden" name="id" value={x.id} />
                    <button className="underline">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
            {sInv.length ? <h3 className="mt-4 font-semibold">Pending invitations</h3> : null}
            <ul className="mt-2 grid gap-2">
              {sInv.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {i.role === "student" ? "Student login" : (i.relationship_label ?? i.relationship)}
                    {i.email ? ` · ${i.email}` : ""} · expires{" "}
                    {new Date(i.expires_at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
                    {i.requires_approval && !i.approved_at ? " · needs guardian approval" : ""}
                  </span>
                  <span className="flex gap-3">
                    {i.requires_approval && !i.approved_at ? (
                      <form action={approveInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="underline">Approve</button>
                      </form>
                    ) : null}
                    <form action={revokeInvitation}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="underline">Cancel</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-semibold">Invite someone</h3>
            <div className="mt-2">
              <InviteForm studentId={s.id} siteUrl={SITE_URL} />
            </div>
          </NeonWindow>
        );
      })}
    </div>
  );
}
