import Link from "next/link";
import { GlassPanel } from "@sparkle/ui";
import { SparkleCharacter } from "@sparkle/character";
import { signInWithGoogle } from "./login/actions";
import { WaitlistForm } from "@/components/WaitlistForm";
import { ChatWidget } from "@/components/ChatWidget";
import { SiteFooter } from "@/components/SiteFooter";

// DRAFT MARKETING COPY — pending sponsor review (FR-17, CR-0003). Structure adapted from the Crystal POC,
// limited to student-success scope. Grade-8 reading level; no unverifiable claims.

const SYSTEMS = [
  { icon: "◎", title: "Today view", body: "Sparkle shows the few things that matter most right now, each with a short reason, so you start with a plan." },
  { icon: "◐", title: "Focus mode", body: "Open one class and everything else fades away. Less noise, more getting it done." },
  { icon: "🤖", title: "Sparkle, your AI coach", body: "Ask for a hint or a study plan. Sparkle coaches and shows sources. It won't do the work for you." },
  { icon: "▦", title: "Classes and units", body: "Each class keeps its current unit, handouts, and helpful links in one place." },
  { icon: "∑", title: "GPA simulator", body: "See how upcoming grades could change your GPA. The math is exact; Sparkle helps explain it." },
  { icon: "⛨", title: "Family sharing and helpers", body: "Parents, grandparents, tutors, and teachers can follow along with read-only access the student can always see." },
  { icon: "🛒", title: "School supply list", body: "A shared list for supplies and materials, kept separate from grades." },
  { icon: "🔒", title: "Privacy and safety", body: "School passwords stay on your computer by default. Nothing goes to a teacher until you say yes." },
];

const SOON = [
  { icon: "✓", title: "Natural-language tasks", body: "Type \"remind me Friday to study for the bio quiz\" and Sparkle files it with a date for you to confirm." },
  { icon: "☁", title: "School-day weather", body: "A quick morning heads-up on rain, cold, or weather alerts for your school's area." },
  { icon: "📷", title: "Scan handouts", body: "Snap a syllabus, flyer, or permission slip and turn it into tasks and dates after you review them." },
  { icon: "✉", title: "School mail vault", body: "A secure place for school letters and forms, searchable, with sensitive papers kept to guardians only." },
];

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="font-semibold tracking-widest">◆ SPARKLE</span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#systems" className="hidden sm:inline">Features</a>
          <Link href="/login" className="spk-glass px-3 py-1.5">Log in</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-6 md:grid-cols-[1.3fr_1fr] md:pt-14">
          <div>
            <p className="text-neon font-mono text-xs tracking-widest">// systems online · student pilot ready</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-6xl">Take command<br />of your school day.</h1>
            <p className="text-muted mt-4 max-w-xl text-lg">
              Sparkle is your calm cockpit for school: grades, assignments, and class updates in one place, with a cheerful AI
              coach riding along. See what matters next, focus, and keep growing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value="/app" />
                <button className="spk-glass spk-glow px-6 py-3 font-semibold hover:brightness-110">Launch your cockpit</button>
              </form>
              <a href="#systems" className="spk-glass px-6 py-3">See the systems</a>
            </div>
            <p className="text-muted mt-4 text-sm">Free preview · Google sign-in · Works on phone and desktop</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <GlassPanel glow className="relative flex flex-col items-center p-8">
              <p className="spk-glass mb-4 px-4 py-2 text-sm">“Hi pilot! I&apos;m Sparkle.”</p>
              <SparkleCharacter state="excited" size={150} />
            </GlassPanel>
          </div>
        </section>

        <section id="systems" className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-neon font-mono text-xs tracking-widest">SHIP SYSTEMS</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">Everything for school on one dashboard</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SYSTEMS.map((f) => (
              <GlassPanel key={f.title} className="p-5">
                <span aria-hidden className="text-neon text-xl">{f.icon}</span>
                <h3 className="mt-2 font-semibold">{f.title}</h3>
                <p className="text-muted mt-2 text-sm">{f.body}</p>
              </GlassPanel>
            ))}
          </div>
          <p className="text-neon mt-10 font-mono text-xs tracking-widest">MODULES COMING SOON</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOON.map((f) => (
              <GlassPanel key={f.title} className="p-5 opacity-90">
                <span aria-hidden className="text-neon text-xl">{f.icon}</span>
                <h3 className="mt-2 font-semibold">{f.title} <span className="text-muted ml-1 rounded-full border border-[var(--spk-border)] px-2 py-0.5 text-[10px] uppercase">Coming soon</span></h3>
                <p className="text-muted mt-2 text-sm">{f.body}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[["Sign in with Google", "A parent sets up the family and invites the student."],
              ["Connect school accounts", "The Sparkle desktop helper syncs grades and work, or you upload files."],
              ["Start with Today", "Check what's next, focus on one thing, and let Sparkle cheer you on."]].map(([t, b], i) => (
              <li key={t}><GlassPanel className="h-full p-5"><span className="text-neon text-sm font-semibold">Step {i + 1}</span>
                <h3 className="mt-1 font-semibold">{t}</h3><p className="text-muted mt-2 text-sm">{b}</p></GlassPanel></li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12">
          <GlassPanel glow className="p-6 text-center sm:p-10">
            <p className="text-neon font-mono text-xs tracking-widest">PRE-FLIGHT</p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">Your cockpit is ready.</h2>
            <ul className="text-muted mx-auto mt-4 max-w-md space-y-1 text-left text-sm">
              <li>▸ Private by design: row-level security keeps each family&apos;s data separate.</li>
              <li>▸ No new passwords: sign in with Google.</li>
              <li>▸ We never sell your data.</li>
            </ul>
            <form action={signInWithGoogle} className="mt-6">
              <input type="hidden" name="next" value="/app" />
              <button className="spk-glass spk-glow px-6 py-3 font-semibold">Sign up with Google</button>
            </form>
            <p className="text-muted mt-6 text-sm">Not ready yet? Join the waitlist:</p>
            <div className="mx-auto mt-2 max-w-xl"><WaitlistForm /></div>
            <p className="text-muted mt-4 text-xs">By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
          </GlassPanel>
        </section>
      </main>

      <SiteFooter />
      <ChatWidget />
    </>
  );
}
