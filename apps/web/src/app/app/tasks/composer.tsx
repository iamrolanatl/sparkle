"use client";
import { useEffect, useState, useTransition } from "react";
import { NeonWindow } from "@sparkle/ui";
import { listTasksAction, parseTaskAction, saveTaskAction } from "./actions";
import { toLocalInput, fromLocalInput } from "./time";

type Parsed = {
  title: string;
  dueAt: string | null;
  dueLabel: string | null;
  classId: string | null;
  className: string | null;
  priority: string;
};
type Task = { id: string; title: string; due_at: string | null; priority: string };
const field = "rounded-lg border border-[var(--spk-border)] bg-transparent px-3 py-2 w-full";

/** FR-21: type it, review Sparkle's interpretation, edit, then save. Nothing saves without the confirm click. */
export function TaskComposer({ students }: { students: { id: string; display_name: string }[] }) {
  const [sid, setSid] = useState(students[0]?.id ?? "");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pending, start] = useTransition();

  const refresh = (id: string) =>
    start(async () => {
      const r = await listTasksAction(id);
      setTasks(r.status === 200 ? ((r.body.tasks as Task[]) ?? []) : []);
    });
  useEffect(() => {
    if (sid) refresh(sid);
  }, [sid]);

  const onParse = () =>
    start(async () => {
      setMsg("");
      const r = await parseTaskAction(sid, text);
      if (r.body.safety === "crisis") return setMsg(String(r.body.message));
      if (r.body.safety === "blocked") return setMsg("Sparkle can't add that one. Try a school or home task.");
      if (r.status !== 200) return setMsg("Couldn't read that right now. Please try again.");
      setDraft(r.body.parsed as Parsed);
    });
  const onSave = () =>
    draft &&
    start(async () => {
      const r = await saveTaskAction(sid, {
        title: draft.title,
        dueAt: draft.dueAt,
        priority: draft.priority,
        classId: draft.classId,
        sourceText: text,
      });
      if (r.status !== 201) return setMsg("Couldn't save. Please try again.");
      setDraft(null);
      setText("");
      setMsg("Saved ✨");
      refresh(sid);
    });

  if (!students.length)
    return (
      <NeonWindow title="Tasks">
        <p className="text-muted">Add a student on the Family page first.</p>
      </NeonWindow>
    );
  return (
    <div className="space-y-6">
      <NeonWindow title="Tell Sparkle a task">
        {students.length > 1 && (
          <select aria-label="Student" className={field + " mb-3"} value={sid} onChange={(e) => setSid(e.target.value)}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onParse();
          }}
        >
          <input
            aria-label="Task"
            className={field}
            maxLength={500}
            placeholder="remind me Friday to study for the bio quiz"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="rounded-lg border border-[var(--spk-neon)] px-4 py-2 hover:shadow-[0_0_16px_var(--spk-neon)] transition-shadow"
            disabled={pending || !text.trim()}
          >
            Read it
          </button>
        </form>
        <p role="status" aria-live="polite" className="mt-3 text-sm">
          {msg}
        </p>
      </NeonWindow>

      {draft && (
        <NeonWindow title="Did I get it right?">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Task
              <input
                className={field}
                maxLength={120}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Due (ET)
              <input
                type="datetime-local"
                className={field}
                value={toLocalInput(draft.dueAt)}
                onChange={(e) => setDraft({ ...draft, dueAt: fromLocalInput(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              Priority
              <select
                className={field}
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            {draft.className && <p className="text-muted text-sm sm:col-span-2">Linked to class: {draft.className}</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-lg border border-[var(--spk-neon)] px-4 py-2 hover:shadow-[0_0_16px_var(--spk-neon)] transition-shadow"
              disabled={pending || !draft.title.trim()}
              onClick={onSave}
            >
              Looks good, save
            </button>
            <button className="rounded-lg px-4 py-2" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </NeonWindow>
      )}

      <NeonWindow title="Open tasks">
        {tasks.length === 0 ? (
          <p className="text-muted text-sm">Nothing here yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex justify-between rounded-lg border border-[var(--spk-border)] px-3 py-2 hover:border-[var(--spk-neon)] transition-colors"
              >
                <span>
                  {t.priority === "high" ? "⚡ " : ""}
                  {t.title}
                </span>
                <span className="text-muted text-sm">
                  {t.due_at
                    ? new Date(t.due_at).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }) + " ET"
                    : "No date"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </NeonWindow>
    </div>
  );
}
