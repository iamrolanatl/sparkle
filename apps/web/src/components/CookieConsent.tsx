"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "spk-consent-v1";
export type Consent = { essential: true; analytics: boolean; gpc: boolean; at: string };

function gpcOn() { return Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl); }

export function readConsent(): Consent | null {
  try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Consent) : null; } catch { return null; }
}
function save(analytics: boolean) {
  const gpc = gpcOn();
  const c: Consent = { essential: true, analytics: analytics && !gpc, gpc, at: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(c));
  window.dispatchEvent(new Event("spk-consent"));
}

/** Essential-only by default; analytics opt-in; GPC forces analytics off. */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => setOpen(!readConsent());
    sync();
    window.addEventListener("spk-consent-open", () => setOpen(true));
    window.addEventListener("spk-consent", sync);
    return () => window.removeEventListener("spk-consent", sync);
  }, []);
  if (!open) return null;
  const gpc = typeof navigator !== "undefined" && gpcOn();
  return (
    <div role="dialog" aria-label="Cookie choices" className="spk-glass fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl p-4 text-sm sm:bottom-5">
      <p>We use only essential cookies to keep you signed in. Optional analytics stay off unless you turn them on.
        {gpc && " Your browser's Global Privacy Control is on, so analytics stay off."} <Link href="/cookies" className="underline">Cookie Policy</Link></p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => save(false)} className="spk-glass spk-glow px-3 py-1.5 font-medium">Essential only</button>
        {!gpc && <button onClick={() => save(true)} className="spk-glass px-3 py-1.5">Allow analytics</button>}
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return <button className="underline" onClick={() => { localStorage.removeItem(KEY); window.dispatchEvent(new Event("spk-consent-open")); }}>Change cookie settings</button>;
}
