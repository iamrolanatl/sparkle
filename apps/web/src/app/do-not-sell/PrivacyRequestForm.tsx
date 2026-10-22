"use client";
import { useActionState, useSyncExternalStore } from "react";
import { submitPrivacyRequest, type PrivacyReqState } from "./actions";

export function PrivacyRequestForm() {
  const [state, action, pending] = useActionState<PrivacyReqState, FormData>(submitPrivacyRequest, { status: "idle" });
  const gpc = useSyncExternalStore(
    () => () => {},
    () => Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl),
    () => false,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      {gpc && (
        <p className="rounded-lg border border-emerald-400/60 p-3 text-sm">
          Your browser sends Global Privacy Control. We already treat this as a request to opt out of sale/sharing.
        </p>
      )}
      <input type="hidden" name="gpc" value={gpc ? "1" : "0"} />
      <label className="flex flex-col gap-1 text-sm">
        Request type
        <select name="request_type" className="spk-glass px-3 py-2" defaultValue="do_not_sell_share">
          <option value="do_not_sell_share">Do not sell or share my personal information</option>
          <option value="access">Access my information</option>
          <option value="delete">Delete my information</option>
          <option value="correct">Correct my information</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input name="email" type="email" required className="spk-glass px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        State of residence (optional)
        <input name="state" className="spk-glass px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Details (optional — please don&apos;t include student grades or health info)
        <textarea name="details" rows={3} className="spk-glass px-3 py-2" />
      </label>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button disabled={pending} className="spk-glass spk-glow px-4 py-2 font-medium">
        {pending ? "Sending…" : "Submit request"}
      </button>
      <p role="status" className="text-sm">
        {state.message}
      </p>
    </form>
  );
}
