"use client";
import { useActionState } from "react";
import { redeem, type RedeemResult } from "./actions";

export function RedeemForm({ initialCode }: { initialCode: string }) {
  const [state, action, pending] = useActionState<RedeemResult, FormData>(redeem, null);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <label className="grid gap-1 text-sm">
        Invitation code
        <input
          name="code"
          defaultValue={initialCode}
          required
          autoComplete="one-time-code"
          className="rounded-lg border border-[var(--spk-border)] bg-transparent px-3 py-2 font-mono tracking-widest uppercase"
        />
      </label>
      <button type="submit" disabled={pending} className="rounded-full border px-4 py-2">
        {pending ? "Checking…" : "Join"}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
