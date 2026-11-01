import Link from "next/link";
import Battle from "@/components/ship/LazyBattle";
import { AgentPigeon } from "@/components/landing/AgentPigeon";
import { WaitlistForm } from "@/components/WaitlistForm";
import { LazyChatWidget as ChatWidget } from "@/components/LazyChatWidget";
import { SiteFooter } from "@/components/SiteFooter";

// Approved sleek dark landing (mockups/sparkle-dark, approved by Rolan 2026-10-22). DRAFT COPY pending sponsor review (FR-17).

const FEATURES = [
  {
    title: "Bridge",
    body: "Shields per class, fuel streak, rank and a threat radar for missing work and tests.",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    title: "Nightly study plan",
    body: "15–30 minutes built from real upcoming tests and missing work. Spacing beats cramming.",
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
    title: "Star Charts",
    body: "Every class with a what-if calculator: see what Friday's test does to the grade.",
    icon: <path d="M4 5h7v14H4zM13 5h7v14h-7z" />,
  },
];

export default function Landing() {
  return (
    <div className="spk-wrap">
      <div className="sh-bg" aria-hidden="true">
        <Battle />
      </div>
      <div className="spk-class" aria-hidden="true">
        STARSHIP SPARKLE // MISSION CONTROL FOR SCHOOL
      </div>
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
              <b>Condition green</b> Mission control for your child's grades
            </p>
            <h1 className="spk-h1">
              Take command of
              <br />
              every grade.
            </h1>
            <p className="spk-sub">
              Shields for every class, a threat radar for missing work and tests, a nightly study plan and a what-if
              grade calculator — with Sparkle, a very smug pigeon co-pilot who keeps the whole crew on course.
            </p>
            <div className="spk-ctas">
              <Link className="spk-btn spk-btn-p" href="/login?next=/app">
                Launch mission →
              </Link>
              <a className="spk-btn spk-btn-s" href="#features">
                See how it works
              </a>
            </div>
          </div>
          <AgentPigeon />
        </section>

        <section id="features" aria-label="Features" className="spk-feats">
          {FEATURES.map((f) => (
            <div key={f.title} className="spk-f">
              <div className="spk-ic" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5dffa5" strokeWidth="2">
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
