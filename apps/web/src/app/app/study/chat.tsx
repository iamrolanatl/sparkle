"use client";
import { useState, useTransition } from "react";
import { ErrorBoundary, NeonWindow } from "@sparkle/ui";
import { askStudyHelperAction } from "../tasks/actions";
import { safetyMessage } from "../tasks/safety-message";

type Msg = { who: "you" | "sparkle"; text: string; coach?: boolean };
const field = "rounded-lg border border-[var(--spk-border)] bg-transparent px-3 py-2 w-full";

type Student = { id: string; display_name: string };

/** Owns the selected student. The log lives in <Chat key={sid}> so switching students remounts it with an
 *  empty log, and late replies for the previous student land on the unmounted instance and are dropped. */
function StudentChat({ students }: { students: Student[] }) {
  const [sid, setSid] = useState(students[0]?.id ?? "");
  return <Chat key={sid} sid={sid} setSid={setSid} students={students} />;
}

function Chat({ students, sid, setSid }: { students: Student[]; sid: string; setSid: (id: string) => void }) {
  const [text, setText] = useState("");
  const [log, setLog] = useState<Msg[]>([]);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const q = text.trim();
      if (!q) return;
      setText("");
      setLog((l) => [...l, { who: "you", text: q }]);
      const r = await askStudyHelperAction(sid, q);
      const safe = r.body.safety === "crisis" ? safetyMessage(r.body) : null;
      const reply =
        safe ??
        (r.status === 200 && typeof r.body.reply === "string"
          ? r.body.reply
          : r.status === 503
            ? "I'm resting right now. Try again soon!"
            : "I can help with schoolwork. Try asking about a topic you're studying.");
      setLog((l) => [...l, { who: "sparkle", text: reply, coach: r.body.mode === "coach" }]);
    });
  return (
    <NeonWindow title="Study helper">
      <p className="text-muted text-sm">
        I&apos;m Sparkle, an AI. I&apos;ll explain and give hints — you do the thinking. Don&apos;t share passwords or
        addresses.
      </p>
      {students.length > 1 && (
        <select aria-label="Student" className={field + " mt-3"} value={sid} onChange={(e) => setSid(e.target.value)}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
            </option>
          ))}
        </select>
      )}
      <ol className="mt-4 space-y-2" aria-live="polite">
        {log.map((m, i) => (
          <li key={i} className={m.who === "you" ? "text-right" : "spk-glass rounded-lg px-3 py-2"}>
            {m.coach && <span className="text-neon mr-2 text-xs">Coach mode</span>}
            {m.text}
          </li>
        ))}
      </ol>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          aria-label="Ask a study question"
          className={field}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="rounded-lg border border-[var(--spk-neon)] px-4 py-2 transition-shadow hover:shadow-[0_0_16px_var(--spk-neon)]"
          disabled={pending || !text.trim() || !sid}
        >
          Ask
        </button>
      </form>
    </NeonWindow>
  );
}

export function StudyChat(props: { students: Student[] }) {
  return (
    <ErrorBoundary name="study-helper">
      <StudentChat {...props} />
    </ErrorBoundary>
  );
}
