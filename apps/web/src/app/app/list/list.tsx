"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { burst } from "../chrome";
import { addItemAction, deleteItemAction, listAction, updateItemAction } from "./actions";

export type Item = {
  id: string;
  title: string;
  quantity: number;
  done: boolean;
  category: "school" | "household";
  class_label: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string;
  done_by: string | null;
  done_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};
export type Member = { profile_id: string; name: string; role: "guardian" | "student" };
export type ListData = { household: string; me: string; items: Item[]; members: Member[] };
export type Suggestion = { id: string; title: string; className: string | null; detail: string };

const PALETTE = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6"];
function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

export function ShoppingList(p: {
  sid: string;
  student: string;
  initial: ListData | null;
  suggestions: Suggestion[];
  classes: string[];
  rt: { url: string; key: string } | null;
}) {
  const [data, setData] = useState<ListData | null>(p.initial);
  const [sugs, setSugs] = useState(p.suggestions);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"all" | "school" | "household">("all");
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const chan = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  const refresh = useCallback(async () => {
    const r = await listAction(p.sid);
    if (r.status === 200) setData(r.body as unknown as ListData);
  }, [p.sid]);

  const ping = useCallback(() => {
    chan.current?.send({ type: "broadcast", event: "changed", payload: {} });
  }, []);

  // Realtime: RLS-filtered postgres_changes + broadcast nudge + presence for "online".
  useEffect(() => {
    if (!p.rt || !data?.household) return;
    const sb = createBrowserClient(p.rt.url, p.rt.key);
    let t: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(t);
      t = setTimeout(refresh, 250);
    };
    const ch = sb.channel(`list:${data.household}`, { config: { presence: { key: data.me } } });
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${data.household}` },
      soon,
    )
      .on("broadcast", { event: "changed" }, soon)
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
      .subscribe(async (s) => {
        setLive(s === "SUBSCRIBED");
        if (s === "SUBSCRIBED") await ch.track({ at: Date.now() });
      });
    chan.current = ch;
    return () => {
      clearTimeout(t);
      chan.current = null;
      sb.removeChannel(ch);
    };
  }, [p.rt, data?.household, data?.me, refresh]);

  const members = data?.members ?? [];
  const byId = useMemo(
    () =>
      new Map(
        members.map((m, i) => [
          m.profile_id,
          { ...m, color: m.profile_id === data?.me ? "var(--pill)" : PALETTE[i % PALETTE.length]! },
        ]),
      ),
    [members, data?.me],
  );
  const nm = (id: string | null) => (id ? (id === data?.me ? "You" : (byId.get(id)?.name ?? "Someone")) : "");
  const Av = ({ id, lg }: { id: string; lg?: boolean }) => {
    const m = byId.get(id);
    const me = id === data?.me;
    return (
      <span
        className={`lv-av ${lg ? "lg" : ""}`}
        style={{ background: m?.color ?? "#94a3b8", color: me ? "var(--pillt)" : "#fff" }}
        title={m?.name}
      >
        {(m?.name ?? "?").charAt(0).toUpperCase()}
      </span>
    );
  };

  function mutate(
    fn: () => Promise<{ status: number; body: Record<string, unknown> }>,
    optimistic?: (d: ListData) => ListData,
  ) {
    setErr(null);
    if (optimistic && data) setData(optimistic(data));
    start(async () => {
      const r = await fn();
      if (r.status >= 300) setErr("That didn't save. Try again.");
      await refresh();
      ping();
    });
  }
  const patch = (it: Item, ch: Partial<Item>) =>
    mutate(
      () => updateItemAction(p.sid, it.id, ch),
      (d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, ...ch } : x)) }),
    );

  function add(e?: React.FormEvent, extra?: Record<string, unknown>) {
    e?.preventDefault();
    const body = extra ?? { text: text.trim(), classes: p.classes };
    if (!extra && !text.trim()) return;
    setText("");
    mutate(() => addItemAction(p.sid, body));
  }
  function remove(it: Item) {
    setMenu(null);
    mutate(
      () => deleteItemAction(p.sid, it.id),
      (d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }),
    );
    setToast({
      msg: `Removed ${it.title}`,
      undo: () =>
        add(undefined, {
          title: it.title,
          quantity: it.quantity,
          category: it.category,
          class_label: it.class_label,
          notes: it.notes,
        }),
    });
    setTimeout(() => setToast(null), 6000);
  }

  if (!data)
    return (
      <>
        <h1>Shopping list</h1>
        <div className="panel empty" style={{ marginTop: 16 }}>
          The list couldn&apos;t load right now. Refresh to try again.
        </div>
      </>
    );
  const open = data.items.filter((i) => !i.done);
  const done = data.items.filter((i) => i.done);
  const school = open.filter((i) => i.category === "school");
  const house = open.filter((i) => i.category === "household");
  const activity = [...data.items]
    .map((i) =>
      i.done && i.done_by
        ? { who: i.done_by, what: `checked off ${i.title}`, at: i.done_at! }
        : i.assigned_to
          ? { who: i.assigned_to, what: `is buying ${i.title}`, at: i.updated_at }
          : { who: i.created_by, what: `added ${i.title}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`, at: i.created_at },
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5);

  const Row = ({ it }: { it: Item }) => (
    <div className={`lv-row ${it.done ? "lv-done" : ""}`} data-testid="list-item">
      <button
        type="button"
        className="lv-ck"
        aria-label={it.done ? `Uncheck ${it.title}` : `Check off ${it.title}`}
        onClick={(e) => {
          if (!it.done) burst(e.currentTarget);
          patch(it, { done: !it.done });
        }}
      >
        ✓
      </button>
      <div className="lv-grow">
        <div className="lv-t">
          {it.title}
          {it.source === "teacher_post" ? <span className="spk"> ✦</span> : null}
        </div>
        <div className="lv-s">
          {it.class_label ? (
            <>
              <span className="lv-tag">{it.class_label}</span> ·{" "}
            </>
          ) : null}
          added by {nm(it.created_by)}
          {it.assigned_to ? (
            <>
              {" "}
              · <b style={{ color: "var(--fg)" }}>{nm(it.assigned_to)} buying</b>
            </>
          ) : null}
        </div>
        {editing === it.id ? (
          <input
            className="lv-edit"
            autoFocus
            defaultValue={it.notes ?? ""}
            maxLength={280}
            placeholder="Add a note (brand, size…)"
            aria-label="Note"
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(null);
            }}
            onBlur={(e) => {
              setEditing(null);
              if ((e.target.value || null) !== it.notes) patch(it, { notes: e.target.value || null });
            }}
          />
        ) : it.notes ? (
          <div className="lv-note">“{it.notes}”</div>
        ) : null}
      </div>
      {!it.done ? (
        <div className="lv-qty" aria-label={`Quantity ${it.quantity}`}>
          <button
            type="button"
            aria-label="Decrease"
            disabled={it.quantity <= 1}
            onClick={() => patch(it, { quantity: it.quantity - 1 })}
          >
            −
          </button>
          <span data-testid="qty">{it.quantity}</span>
          <button
            type="button"
            aria-label="Increase"
            onClick={() => patch(it, { quantity: Math.min(999, it.quantity + 1) })}
          >
            +
          </button>
        </div>
      ) : null}
      <div style={{ position: "relative" }}>
        {it.assigned_to ? (
          <button
            type="button"
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
            aria-label="Change who's buying"
            onClick={() => setMenu(menu === it.id ? null : it.id)}
          >
            <Av id={it.assigned_to} />
          </button>
        ) : (
          <button type="button" className="lv-ghost" onClick={() => setMenu(menu === it.id ? null : it.id)}>
            Assign
          </button>
        )}
        {menu === it.id ? (
          <div className="lv-menu" role="menu">
            {members.map((m) => (
              <button
                key={m.profile_id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  patch(it, { assigned_to: m.profile_id });
                }}
              >
                <Av id={m.profile_id} /> {m.profile_id === data.me ? "Me" : m.name}
              </button>
            ))}
            {it.assigned_to ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  patch(it, { assigned_to: null });
                }}
              >
                Unassign
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setEditing(it.id);
              }}
            >
              ✎ {it.notes ? "Edit note" : "Add note"}
            </button>
            <button type="button" role="menuitem" onClick={() => remove(it)}>
              🗑 Remove
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const show = (k: "school" | "household") => tab === "all" || tab === k;
  return (
    <>
      <div className="lv-head">
        <div>
          <h1>Shopping list</h1>
          <div className="sub">Shared with {p.student}&apos;s family · updates live</div>
        </div>
        <span className={`lv-live ${live ? "" : "off"}`} data-testid="live">
          <i />
          {live ? `Live · ${online.size || 1} online` : "Connecting…"}
        </span>
      </div>
      <div className="lv-grid">
        <div>
          <div className="lv-card">
            <form className="lv-add" onSubmit={add}>
              <input
                className="lv-in"
                value={text}
                maxLength={160}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add an item — e.g. “2 composition notebooks for ELA”"
                aria-label="Add an item"
              />
              <button className="lv-pill" disabled={pending || !text.trim()}>
                Add
              </button>
            </form>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div className="lv-seg">
                {(
                  [
                    ["all", `All ${open.length}`],
                    ["school", `School supplies ${school.length}`],
                    ["household", `Household ${house.length}`],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                    {l}
                  </button>
                ))}
              </div>
              {err ? (
                <span className="lv-s" style={{ color: "var(--bad, #f43f5e)" }}>
                  {err}
                </span>
              ) : null}
            </div>
          </div>
          {show("school") ? (
            <div className="lv-card">
              <h3>
                School supplies<span className="spk">✦</span>
              </h3>
              {school.length ? (
                school.map((it) => <Row key={it.id} it={it} />)
              ) : (
                <div className="lv-s">Nothing needed for school right now.</div>
              )}
            </div>
          ) : null}
          {show("household") ? (
            <div className="lv-card">
              <h3>Household</h3>
              {house.length ? (
                house.map((it) => <Row key={it.id} it={it} />)
              ) : (
                <div className="lv-s">Nothing on the household list.</div>
              )}
            </div>
          ) : null}
          {done.length ? (
            <div className="lv-card">
              <h3 style={{ color: "var(--dim)" }}>Checked off · {done.length}</h3>
              {done.map((it) => (
                <Row key={it.id} it={it} />
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <div className="lv-card">
            <h3>
              Suggested from teacher posts<span className="spk">✦</span>
            </h3>
            <div className="lv-s" style={{ marginBottom: 6 }}>
              Sparkle spots supply mentions on class boards. Nothing is added until you tap.
            </div>
            {sugs.length ? (
              sugs.map((s) => (
                <div className="lv-row" key={s.id}>
                  <div className="lv-grow">
                    <div className="lv-t">{s.title}</div>
                    <div className="lv-s">
                      {s.className ? `${s.className} · ` : ""}
                      {s.detail}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="lv-ghost"
                    onClick={() => {
                      setSugs((x) => x.filter((y) => y.id !== s.id));
                      add(undefined, {
                        title: s.title,
                        category: "school",
                        class_label: s.className,
                        source: "teacher_post",
                      });
                    }}
                  >
                    + Add
                  </button>
                </div>
              ))
            ) : (
              <div className="lv-s" style={{ paddingTop: 6 }}>
                No supply mentions in recent posts.
              </div>
            )}
          </div>
          <div className="lv-card">
            <h3>Who&apos;s on this list</h3>
            {members.map((m) => (
              <div className="lv-row" key={m.profile_id}>
                <Av id={m.profile_id} lg />
                <div className="lv-grow">
                  <div className="lv-t" style={{ fontSize: 14 }}>
                    {m.profile_id === data.me ? `${m.name} (you)` : m.name}
                  </div>
                  <div className="lv-s">{m.role === "student" ? "Student" : "Guardian"}</div>
                </div>
                {online.has(m.profile_id) ? (
                  <span className="lv-live">
                    <i />
                    online
                  </span>
                ) : null}
              </div>
            ))}
            <div className="lv-s" style={{ marginTop: 10 }}>
              Only list items are shared here, never grades or messages.
            </div>
          </div>
          <div className="lv-card">
            <h3>Recent activity</h3>
            {activity.length ? (
              activity.map((a, i) => (
                <div className="lv-row" key={i}>
                  <Av id={a.who} />
                  <div className="lv-grow lv-s">
                    <b style={{ color: "var(--fg)" }}>{nm(a.who)}</b> {a.what}
                  </div>
                  <span className="lv-s">{ago(a.at)}</span>
                </div>
              ))
            ) : (
              <div className="lv-s">No activity yet.</div>
            )}
          </div>
        </div>
      </div>
      {toast ? (
        <div className="lv-toast" role="status">
          {toast.msg}
          {toast.undo ? (
            <button
              type="button"
              onClick={() => {
                toast.undo!();
                setToast(null);
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
