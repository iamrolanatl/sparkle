import Link from "next/link";
import { GlassPanel } from "@sparkle/ui/GlassPanel";

export function LegalPage({
  title,
  updated = "2026-10-21",
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <GlassPanel className="p-6 sm:p-8">
        <p role="note" className="mb-4 rounded-lg border border-amber-400/60 p-3 text-sm">
          <strong>Draft — pending legal review.</strong> This page is a working draft and is not yet in effect. It will
          be reviewed by counsel (including FERPA, COPPA and state privacy law) before Sparkle launches publicly.
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="text-muted mt-1 text-sm">Last updated: {updated}</p>
        <div className="legal mt-6 flex flex-col gap-4 leading-relaxed">{children}</div>
        <Link href="/" className="mt-8 inline-block underline">
          Back to home
        </Link>
      </GlassPanel>
    </main>
  );
}
