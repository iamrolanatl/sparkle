import { GpaSimulator } from "./simulator";

export const metadata = { title: "GPA simulator", robots: { index: false } };

export default function GpaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <GpaSimulator />
    </main>
  );
}
