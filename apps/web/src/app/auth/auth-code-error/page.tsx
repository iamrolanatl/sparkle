import Link from "next/link";
import { GlassPanel } from "@sparkle/ui";

export default function AuthError() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <GlassPanel className="w-full p-6">
        <h1 className="text-xl font-semibold">Sign-in didn&apos;t finish</h1>
        <p className="text-muted mt-2">No worries. Let&apos;s try that again.</p>
        <Link href="/login" className="mt-4 inline-block underline">Back to sign in</Link>
      </GlassPanel>
    </main>
  );
}
