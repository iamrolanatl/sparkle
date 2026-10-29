import { W } from "@/components/agent/Pigeon";
import { redirect } from "next/navigation";
import { getClasses, getSb, getStudents, getUser } from "@/lib/req";
import { pickStudent } from "@/lib/classes/load";
import { dontMiss } from "@/lib/classes/guidance";
import { studyStatusAction } from "../tasks/actions";
import { Bot } from "../chrome";
import { AskSparkle } from "./ask-sparkle";
import "./ask.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ask Sparkle", robots: { index: false } };

/** Ask Sparkle (approved mockup sparkle-voice). Behind `study_helper` (global or per-student allowlist). */
export default async function StudyPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const supabase = await getSb();
  const user = await getUser();
  if (!supabase || !user) redirect("/login?next=/app/study");
  const { s } = await searchParams;
  const me = pickStudent(await getStudents(), user.id, s);
  // Start the class load alongside the feature check so they don't run one after another.
  const classesP = me ? getClasses(me.id) : null;
  const status = me ? await studyStatusAction(me.id) : { body: { enabled: false } };
  if (!me || status.body.enabled !== true)
    return (
      <div className="page">
        <h1>
          <W a="Secure line" p="Ask Sparkle" />
        </h1>
        <div className="sub">Your study helper</div>
        <div className="panel empty" style={{ marginTop: 20, display: "flex", gap: 14, alignItems: "center" }}>
          <Bot size={44} />
          <div>
            Ask Sparkle coaches students through homework without doing it for them. It&apos;s switched off for this
            student until child-safety review is finished.
          </div>
        </div>
      </div>
    );
  const classes = await classesP!;
  const first = me.display_name.split(" ")[0] ?? "";
  const items = dontMiss(classes).slice(0, 3);
  const sugg: string[] = ["What's due this week?"];
  const DATEY = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d|^week\b|\d+\/\d+/i;
  const cu = classes.find((c) => c.unit && !DATEY.test(c.unit.title));
  if (cu?.unit) sugg.push(`Quiz me on ${cu.unit.title.replace(/^Unit\s*\d+\s*[·:-]\s*/i, "").slice(0, 36)}`);
  if (items.length) sugg.push("What did my teachers post that I should know?");
  const low = [...classes].filter((c) => c.pct != null).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  if (low) sugg.push(`Help me make a study plan for ${low.name.slice(0, 28)}`);
  const greet = items.length
    ? `Hi ${first}! From your teachers: ${items
        .slice(0, 2)
        .map((d) => `${d.text}${d.when ? ` (${d.when})` : ""}`)
        .join("; ")}. Want to start with one?`
    : `Hi ${first}! I can quiz you, explain a topic, or help plan your week. What are you working on?`;
  return (
    <div className="page">
      <h1>
        <W a="Secure line" p="Ask Sparkle" />
      </h1>
      <div className="sub">Your study helper. Type or tap the mic.</div>
      <AskSparkle
        studentId={me.id}
        greet={greet}
        greetSources={items.slice(0, 2).map((d) => d.className)}
        suggestions={sugg.slice(0, 4)}
        classes={classes.slice(0, 8).map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          pct: c.pct,
          unit: c.unit?.title ?? null,
        }))}
      />
    </div>
  );
}
