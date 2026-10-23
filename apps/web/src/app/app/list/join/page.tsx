import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteAction } from "../actions";
import "../../list-vault.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join shopping list", robots: { index: false } };

const MSG: Record<string, string> = {
  email_mismatch:
    "This invite was sent to a different email. Sign out and sign in with the email the invite was sent to.",
  already_owner: "You're already on this list.",
  invalid_invite: "This invite link isn't valid anymore. Ask the list owner for a new link.",
};

export default async function JoinList({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const supabase = await createClient();
  const user = (await supabase?.auth.getUser())?.data.user;
  if (!supabase || !user) redirect(`/login?next=${encodeURIComponent(`/app/list/join?t=${t}`)}`);
  const r = await acceptInviteAction(t);
  if (r.status === 200 && typeof r.body.household === "string") redirect(`/app/list?l=${r.body.household}`);
  return (
    <div className="page">
      <h1>Join shopping list</h1>
      <div className="lv-card" style={{ marginTop: 16 }} data-testid="join-error">
        {MSG[String(r.body.error)] ?? MSG.invalid_invite}
        <div style={{ marginTop: 12 }}>
          <a className="lv-ghost" href="/app/list">
            Go to my list
          </a>
        </div>
      </div>
    </div>
  );
}
