export const metadata = { title: "Offline", robots: { index: false } };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-4xl" aria-hidden>
        ✦
      </p>
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted">Sparkle will be right here when you reconnect. Your work isn&apos;t lost.</p>
    </main>
  );
}
