import { NeonWindow } from "@sparkle/ui";
import { RedeemForm } from "./redeem-form";

export const metadata = { title: "Join with a code", robots: { index: false } };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <NeonWindow title="Join a student's circle">
        <p className="text-muted text-sm">
          Sign in with Google, then enter the code you were given. Codes work once and expire after 72 hours.
        </p>
        <RedeemForm initialCode={code ?? ""} />
      </NeonWindow>
    </main>
  );
}
