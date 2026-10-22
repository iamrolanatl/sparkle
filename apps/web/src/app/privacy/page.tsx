import Link from "next/link";
import { GlassPanel } from "@sparkle/ui";

export const metadata = { title: "Privacy Policy" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <GlassPanel className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p role="note" className="mt-4 rounded-lg border border-amber-400/60 p-3 text-sm">
          Placeholder. This page will be written and reviewed by legal counsel (including FERPA/COPPA review)
          before Sparkle launches publicly.
        </p>
        <Link href="/" className="mt-6 inline-block underline">Back to home</Link>
      </GlassPanel>
    </main>
  );
}
