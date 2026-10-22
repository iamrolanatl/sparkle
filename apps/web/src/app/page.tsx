import Link from "next/link";
import { SparkRobot } from "@/components/landing/SparkRobot";
import { WaitlistForm } from "@/components/WaitlistForm";
import { LazyChatWidget as ChatWidget } from "@/components/LazyChatWidget";
import { SiteFooter } from "@/components/SiteFooter";

// Approved sleek dark landing (mockups/sparkle-dark, approved by Rolan 2026-10-22). DRAFT COPY pending sponsor review (FR-17).

const FEATURES = [
  {
    title: "Today view",
    body: "Every class, task and deadline for today at a glance.",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    title: "Focus mode",
    body: "Timed study sprints that block the noise.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
  },
  {
    title: "AI coach",
    body: "Ask anything, get step-by-step help — never just answers.",
    icon: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />,
  },
  {
    title: "Classes & units",
    body: "Grades and units organised, with a GPA simulator.",
    icon: <path d="M4 5h7v14H4zM13 5h7v14h-7z" />,
  },
];

export default function Landing() {
  return (
    <div className="spk-wrap">
      <header className="spk-nav">
        <span className="spk-logo">
          <i aria-hidden />
          SPARKLE
        </span>
        <nav className="spk-nav-links" aria-label="Main">
          <a href="#features">Features</a>
          <Link href="/login" className="spk-btn spk-btn-s">
            Log in
          </Link>
        </nav>
      </header>

      <main>
        <section className="spk-hero">
          <div>
            <p className="spk-pill">
              <b>New</b> AI coach for every class
            </p>
            <h1 className="spk-h1">
              Take command of
              <br />
              your school day.
            </h1>
            <p className="spk-sub">
              Grades, deadlines and focus time in one calm place — with a friendly coach that keeps you one step ahead.
            </p>
            <div className="spk-ctas">
              <Link className="spk-btn spk-btn-p" href="/login?next=/app">
                Get started free →
              </Link>
              <a className="spk-btn spk-btn-s" href="#features">
                See how it works
              </a>
            </div>
          </div>
          <SparkRobot />
        </section>

        <section id="features" aria-label="Features" className="spk-feats">
          {FEATURES.map((f) => (
            <div key={f.title} className="spk-f">
              <div className="spk-ic" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ee0f0" strokeWidth="2">
                  {f.icon}
                </svg>
              </div>
              <h2 className="spk-f-title">{f.title}</h2>
              <p>{f.body}</p>
            </div>
          ))}
        </section>

        <section className="spk-waitlist spk-glass" aria-labelledby="wl-h">
          <h2 id="wl-h" className="text-lg font-semibold">
            Not ready yet? Join the waitlist.
          </h2>
          <p className="text-muted mt-1 text-sm">
            We never sell your data. By continuing you agree to the{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-4">
            <WaitlistForm />
          </div>
        </section>
      </main>

      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
