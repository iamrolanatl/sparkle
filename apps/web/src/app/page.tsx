import Link from "next/link";
import { GlassPanel } from "@sparkle/ui";
import { SparkleCharacter } from "@sparkle/character";
import { signInWithGoogle } from "./login/actions";
import { WaitlistForm } from "@/components/WaitlistForm";

// DRAFT MARKETING COPY — pending sponsor review (FR-17). Grade-8 reading level; no unverifiable claims.

const FEATURES = [
  { title: "Today view", body: "Open Sparkle and see the few things that matter most right now, with a short reason for each one." },
  { title: "Focus mode", body: "Pick one class and the rest fades away. Fewer tabs, less noise, more getting it done." },
  { title: "Family sharing and helpers", body: "Parents, grandparents, tutors, and other helpers can follow along. The student can always see who has access." },
  { title: "Sparkle, your AI coach", body: "Ask Sparkle for a hint or a plan. Sparkle coaches and shows its sources. It won't do the work for you." },
  { title: "GPA simulator", body: "See how upcoming grades could change your GPA. The math is exact; Sparkle just helps explain it." },
  { title: "Privacy and safety", body: "School logins stay on your own computer by default. Nothing is sent to a teacher until you say yes." },
];

const STEPS = [
  { n: "1", title: "Sign in with Google", body: "A parent creates the family and invites the student." },
  { n: "2", title: "Connect school accounts", body: "The Sparkle desktop helper syncs grades and work. You can also upload files." },
  { n: "3", title: "Start with Today", body: "Check what's next, focus on one thing, and let Sparkle cheer you on." },
];

const FAQ = [
  { q: "Who is Sparkle for?", a: "Students and the families who support them. We are starting with Cobb County, Georgia schools." },
  { q: "Does Sparkle do homework for students?", a: "No. Sparkle is a coach. It gives hints, plans, and sources so students can do their best work." },
  { q: "Who can see my student's information?", a: "Only people you invite. Students can see a list of everyone with access, and access can be removed at any time." },
  { q: "Where are school passwords stored?", a: "By default, on your own computer, not on our servers." },
  { q: "How much does it cost?", a: "Pricing hasn't been set yet. Join the waitlist and we'll let you know." },
  { q: "When can we start?", a: "Sparkle is in early development. Join the waitlist to hear when it's ready." },
];

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold tracking-wide">Sparkle</span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#features" className="hidden sm:inline">Features</a>
          <a href="#how" className="hidden sm:inline">How it works</a>
          <a href="#faq" className="hidden sm:inline">FAQ</a>
          <Link href="/login" className="spk-glass px-3 py-1.5">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-6 md:grid-cols-[1.3fr_1fr] md:pt-14">
          <div>
            <p className="text-muted text-xs uppercase tracking-widest">Draft · Early access</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              School, made calm. <span className="text-neon">One next step at a time.</span>
            </h1>
            <p className="text-muted mt-4 max-w-xl text-lg">
              Sparkle brings your grades, assignments, and class updates into one place. It shows what matters
              next, so you can focus, grow, and feel in control.
            </p>
            <form action={signInWithGoogle} className="mt-8">
              <input type="hidden" name="next" value="/app" />
              <button className="spk-glass spk-glow px-6 py-3 text-base font-semibold hover:brightness-110">Sign up with Google</button>
            </form>
            <div className="mt-6 max-w-xl">
              <p className="text-muted mb-2 text-sm">Not ready yet? Get updates:</p>
              <WaitlistForm />
            </div>
          </div>
          <div className="flex justify-center">
            <GlassPanel glow className="flex items-center justify-center p-8">
              <SparkleCharacter state="excited" size={150} />
            </GlassPanel>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">What Sparkle helps with</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <GlassPanel key={f.title} className="p-5">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-muted mt-2 text-sm">{f.body}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}><GlassPanel className="h-full p-5">
                <span className="text-neon text-sm font-semibold">Step {s.n}</span>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="text-muted mt-2 text-sm">{s.body}</p>
              </GlassPanel></li>
            ))}
          </ol>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Questions</h2>
          <div className="mt-6 flex flex-col gap-3">
            {FAQ.map((f) => (
              <GlassPanel key={f.q} className="p-0">
                <details className="group p-5">
                  <summary className="cursor-pointer font-medium">{f.q}</summary>
                  <p className="text-muted mt-2 text-sm">{f.a}</p>
                </details>
              </GlassPanel>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm sm:flex-row sm:justify-between">
        <span className="text-muted">© {new Date().getFullYear()} Sparkle. Draft site.</span>
        <nav className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link></nav>
      </footer>
    </>
  );
}
