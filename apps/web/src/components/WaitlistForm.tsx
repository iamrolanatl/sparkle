"use client";
import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist-action";

export function WaitlistForm() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });
  return (
    <form action={action} className="flex w-full flex-col gap-3 sm:flex-row" aria-describedby="waitlist-msg">
      <label className="sr-only" htmlFor="wl-email">
        Email
      </label>
      <input
        id="wl-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="spk-glass min-w-0 flex-1 px-4 py-3 placeholder:opacity-70"
      />
      <label className="sr-only" htmlFor="wl-role">
        I am a
      </label>
      <select id="wl-role" name="role" className="spk-glass px-3 py-3" defaultValue="parent">
        <option value="parent">Parent</option>
        <option value="student">Student</option>
        <option value="educator">Educator</option>
        <option value="other">Other</option>
      </select>
      {/* honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button disabled={pending} className="spk-glass px-5 py-3 font-medium hover:brightness-110 disabled:opacity-60">
        {pending ? "Joining…" : "Join the waitlist"}
      </button>
      <p id="waitlist-msg" role="status" className="text-muted text-sm sm:sr-only">
        {state.message}
      </p>
      {state.message && (
        <p className="text-sm sm:basis-full" aria-hidden>
          {state.message}
        </p>
      )}
    </form>
  );
}
