"use client";
import { burst } from "../chrome";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ErrorBoundary } from "@sparkle/ui";
import { daysUntil, dueText } from "@/lib/classes/due";
import { safetyMessage } from "./safety-message";
import { deleteTaskAction, listTasksAction, parseTaskAction, saveTaskAction, setTaskDoneAction } from "./actions";
import { toLocalInput, fromLocalInput } from "./time";

type Parsed = {
  title: string;
  dueAt: string | null;
  dueLabel: string | null;
  classId: string | null;
  className: string | null;
  priority: string;
};
type Task = { id: string; title: string; due_at: string | null; priority: string; done_at?: string | null };
export type SchoolItem = {
  id: string;
  title: string;
  due_at: string | null;
  category: string | null;
  status: string | null;
  className: string;
  color: string;
};
type Tab = "upcoming" | "overdue" | "done" | "class";

/** FR-21: type it, review Sparkle's interpretation, edit, then save. Nothing saves without the confirm click. */
function TaskComposerInner({
  students,
  initial,
  school,
}: {
  students: { id: string; display_name: string }[];
  initial: string;
  school: SchoolItem[];
}) {
  const sid = initial;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Parsed | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [msg, setMsg] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [pending, start] = useTransition();

  const refresh = useCallback(
    (id: string) =>
      start(async () => {
        const [r, d] = await Promise.all([listTasksAction(id), listTasksAction(id, true)]);
        setTasks(r.status === 200 ? ((r.body.tasks as Task[]) ?? []) : []);
        setDone(d.status === 200 ? ((d.body.tasks as Task[]) ?? []) : []);
      }),
    [],
  );
  useEffect(() => {
    if (sid) refresh(sid);
  }, [sid, refresh]);

  const onParse = () =>
    start(async () => {
      setMsg("");
      const r = await parseTaskAction(sid, text);
      const safe = safetyMessage(r.body);
      if (safe) return setMsg(safe);
      if (r.status !== 200) return setMsg("Couldn't read that right now. Please try again.");
      setDraft(r.body.parsed as Parsed);
      setDraftKey(crypto.randomUUID()); // one key per reviewed draft: retries can't duplicate
    });
  /** Only the "Looks good, save" click passes confirmed=true. */
  const onSave = (confirmed: boolean) =>
    draft &&
    start(async () => {
      const r = await saveTaskAction(
        sid,
        { title: draft.title, dueAt: draft.dueAt, priority: draft.priority, classId: draft.classId },
        confirmed,
        draftKey,
      );
      const safe = safetyMessage(r.body);
      if (safe) return setMsg(safe);
      if (r.status !== 201) return setMsg("Couldn't save. Please try again.");
      setDraft(null);
      setText("");
      setMsg("Saved ✨");
      refresh(sid);
    });
  const toggle = (id: string, makeDone: boolean) =>
    start(async () => {
      const r = await setTaskDoneAction(sid, id, makeDone);
      if (r.status !== 200) return setMsg("Couldn't update that task. Please try again.");
      setMsg(makeDone ? "Nice work! Task done ✅" : "Task reopened.");
      refresh(sid);
    });
  const onDelete = (id: string) =>
    start(async () => {
      const r = await deleteTaskAction(sid, id);
      if (r.status !== 200) return setMsg("Couldn't delete that. Please try again.");
      setMsg("Task deleted.");
      refresh(sid);
    });

  const now = useMemo(() => new Date(), []);
  const isLate = (iso: string | null) => !!iso && daysUntil(iso, now) < 0;
  const upcomingSchool = school.filter((a) => !isLate(a.due_at));
  const lateSchool = school.filter((a) => isLate(a.due_at));
  const openTasks = tasks.filter((t) => !isLate(t.due_at));
  const lateTasks = tasks.filter((t) => isLate(t.due_at));
  type Row = { kind: "task"; t: Task } | { kind: "school"; a: SchoolItem };
  const sortRows = (rows: Row[]) =>
    rows.sort((x, y) => {
      const dx = x.kind === "task" ? x.t.due_at : x.a.due_at;
      const dy = y.kind === "task" ? y.t.due_at : y.a.due_at;
      return (dx ? Date.parse(dx) : Infinity) - (dy ? Date.parse(dy) : Infinity);
    });
  const rows: Row[] =
    tab === "upcoming"
      ? sortRows([
          ...openTasks.map((t) => ({ kind: "task" as const, t })),
          ...upcomingSchool.map((a) => ({ kind: "school" as const, a })),
        ])
      : tab === "overdue"
        ? sortRows([
            ...lateTasks.map((t) => ({ kind: "task" as const, t })),
            ...lateSchool.map((a) => ({ kind: "school" as const, a })),
          ])
        : tab === "done"
          ? done.map((t) => ({ kind: "task" as const, t }))
          : [];
  const byClass = useMemo(() => {
    const m = new Map<string, SchoolItem[]>();
    for (const a of school) m.set(a.className, [...(m.get(a.className) ?? []), a]);
    return [...m.entries()];
  }, [school]);

  if (!students.length)
    return (
      <>
        <h1>Tasks</h1>
        <div className="panel empty" style={{ marginTop: 16 }}>
          Add a student on the{" "}
          <Link href="/app/family" style={{ textDecoration: "underline" }}>
            Family page
          </Link>{" "}
          first.
        </div>
      </>
    );
  const field = "inp";
  return (
    <>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Tasks</h1>
          <div className="sub">School assignments plus your own</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {students.length > 1 &&
            students.map((s) => (
              <Link key={s.id} href={`/app/tasks?s=${s.id}`} className={`tab ${s.id === sid ? "on" : ""}`}>
                {s.display_name}
              </Link>
            ))}
          <button className="up" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            ＋ New task
          </button>
        </div>
      </div>

      {open && (
        <div className="panel" style={{ marginTop: 16, padding: 16 }}>
          <form
            style={{ display: "flex", gap: 8 }}
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
              autoFocus
            />
            <button className="up" style={{ marginTop: 0 }} disabled={pending || !text.trim()}>
              Read it
            </button>
          </form>
          {draft && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8 }}>Did I get it right?</div>
              <div className="grid s2" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12, color: "var(--mut)" }}>
                  Task
                  <input
                    className={field}
                    maxLength={120}
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </label>
                <label style={{ fontSize: 12, color: "var(--mut)" }}>
                  Due (ET)
                  <input
                    type="datetime-local"
                    className={field}
                    value={toLocalInput(draft.dueAt)}
                    onChange={(e) => setDraft({ ...draft, dueAt: fromLocalInput(e.target.value) })}
                  />
                </label>
                <label style={{ fontSize: 12, color: "var(--mut)" }}>
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
              </div>
              {draft.className && (
                <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>Linked to class: {draft.className}</p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="up" disabled={pending || !draft.title.trim()} onClick={() => onSave(true)}>
                  Looks good, save
                </button>
                <button className="up ghost" onClick={() => setDraft(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <p role="status" aria-live="polite" style={{ fontSize: 13, minHeight: 20, marginTop: 10, color: "var(--acc)" }}>
        {msg}
      </p>

      <div className="tabs" role="tablist" style={{ marginTop: 4 }}>
        {(
          [
            ["upcoming", "Upcoming"],
            ["overdue", `Overdue · ${lateTasks.length + lateSchool.length}`],
            ["done", "Completed"],
            ["class", "By class"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`tab ${tab === k ? "on" : ""}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "class" ? (
        byClass.length ? (
          byClass.map(([name, items]) => (
            <div className="panel" key={name} style={{ marginBottom: 10 }}>
              <div className="ph">
                {name} <span>{items.length}</span>
              </div>
              {items.map((a) => (
                <SchoolRow key={a.id} a={a} now={now} />
              ))}
            </div>
          ))
        ) : (
          <div className="panel empty">No school assignments yet. Import them or connect school sync.</div>
        )
      ) : rows.length ? (
        <div className="panel">
          {rows.map((r) =>
            r.kind === "school" ? (
              <SchoolRow key={r.a.id} a={r.a} now={now} />
            ) : (
              <div className="row" key={r.t.id}>
                <button
                  type="button"
                  className={`cb ${r.t.done_at ? "x" : ""}`}
                  disabled={pending}
                  onClick={(e) => {
                    if (!r.t.done_at) burst(e.currentTarget);
                    toggle(r.t.id, !r.t.done_at);
                  }}
                  aria-label={r.t.done_at ? `Reopen ${r.t.title}` : `Mark ${r.t.title} done`}
                >
                  ✓
                </button>
                <span className="cav" style={{ background: "var(--pill)", color: "var(--pillt)" }} aria-hidden="true">
                  Me
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={r.t.done_at ? { textDecoration: "line-through", color: "var(--mut)" } : { fontWeight: 600 }}
                  >
                    {r.t.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>Personal · added by you</div>
                </div>
                <span className="chip">{r.t.priority === "high" ? "Priority" : "Personal"}</span>
                <span
                  className={`due ${r.t.due_at && !r.t.done_at ? (daysUntil(r.t.due_at, now) < 0 ? "bad" : daysUntil(r.t.due_at, now) <= 1 ? "h" : "") : ""}`}
                >
                  {dueText(r.t.due_at, now)}
                </span>
                <button
                  type="button"
                  className="chip"
                  style={{ background: "none", cursor: "pointer" }}
                  disabled={pending}
                  onClick={() => onDelete(r.t.id)}
                  aria-label={`Delete ${r.t.title}`}
                >
                  Delete
                </button>
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="panel empty">
          {tab === "done"
            ? "Nothing completed yet."
            : tab === "overdue"
              ? "Nothing overdue. 🎉"
              : "Nothing coming up. Click ＋ New task to add one."}
        </div>
      )}
    </>
  );
}

function SchoolRow({ a, now }: { a: SchoolItem; now: Date }) {
  const n = a.due_at ? daysUntil(a.due_at, now) : null;
  return (
    <div className="row">
      <span className="cav" style={{ background: a.color }} aria-hidden="true">
        {a.className
          .replace(/[^A-Za-z0-9 ]/g, "")
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{a.title}</div>
        <div style={{ fontSize: 13, color: "var(--mut)" }}>
          {a.className}
          {a.category ? ` · ${a.category}` : ""}
        </div>
      </div>
      {a.status === "missing" ? <span className="chip">Missing</span> : null}
      <span className={`due ${n == null ? "" : n < 0 ? "bad" : n <= 1 ? "h" : ""}`}>{dueText(a.due_at, now)}</span>
    </div>
  );
}

export function TaskComposer(props: {
  students: { id: string; display_name: string }[];
  initial: string;
  school: SchoolItem[];
}) {
  return (
    <ErrorBoundary
      name="tasks"
      fallback={(reset) => (
        <div className="panel empty">
          Tasks hit a snag. Your saved tasks are safe.{" "}
          <button className="up ghost" onClick={reset}>
            Try again
          </button>
        </div>
      )}
    >
      <TaskComposerInner {...props} />
    </ErrorBoundary>
  );
}
