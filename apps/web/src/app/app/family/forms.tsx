"use client";
import { useActionState } from "react";
import { RELATIONSHIPS } from "@/lib/invite-code";
import { addStudent, createInvitation, type ActionResult } from "./actions";

const field = "w-full rounded-lg border border-[var(--spk-border)] bg-transparent px-3 py-2";

export function AddStudentForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addStudent, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <label className="grid gap-1 text-sm">
        Student name
        <input name="display_name" required maxLength={60} className={field} />
      </label>
      <label className="grid gap-1 text-sm">
        Birth date (optional)
        <input name="birth_date" type="date" className={field} />
      </label>
      <button type="submit" disabled={pending} className="spk-magnetic mag rounded-full border px-4 py-2">
        {pending ? "Adding…" : "Add student"}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-red-400 sm:col-span-3">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function InviteForm({ studentId, siteUrl }: { studentId: string; siteUrl: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createInvitation, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="student_id" value={studentId} />
      <label className="grid gap-1 text-sm">
        Who is this for?
        <select name="role" className={field} defaultValue="helper">
          <option value="helper">A helper (family, sitter, teacher…)</option>
          <option value="student">The student (their own login)</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Relationship
        <select name="relationship" className={field} defaultValue="grandparent">
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {r[0]!.toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Label (optional, e.g. “Grandma Rose”)
        <input name="relationship_label" maxLength={60} className={field} />
      </label>
      <label className="grid gap-1 text-sm">
        Lock to Google email (optional)
        <input name="email" type="email" className={field} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="spk-magnetic mag rounded-full border px-4 py-2">
          {pending ? "Creating…" : "Create invitation"}
        </button>
      </div>
      {state?.ok && state.code ? (
        <div role="status" className="spk-glass rounded-xl p-4 sm:col-span-2">
          <p className="text-sm">Share this once — it expires in 72 hours and works one time.</p>
          <p className="mt-2 font-mono text-2xl tracking-widest" data-testid="invite-code">
            {state.code}
          </p>
          <p className="mt-1 break-all text-sm">
            Link: {siteUrl}/invite?code={encodeURIComponent(state.code)}
          </p>
        </div>
      ) : null}
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-red-400 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
