"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { burst } from "../chrome";
import {
  clearDoneAction,
  hhAddAction,
  hhDeleteAction,
  hhListAction,
  hhUpdateAction,
  inviteAction,
  revokeShareAction,
  sharedListsAction,
} from "./actions";

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
export type Member = { profile_id: string; name: string; role: "guardian" | "student" | "editor" | "viewer" };
export type Share = {
  id: string;
  email: string;
  role: "viewer" | "editor";
  status: "pending" | "active";
  member_profile_id: string | null;
  expires_at: string;
};
export type ListData = {
  household: string;
  me: string;
  role?: "owner" | "editor" | "viewer";
  items: Item[];
  members: Member[];
  shares?: Share[];
};
const ROLE_LABEL: Record<Member["role"], string> = {
  guardian: "Guardian",
  student: "Student",
  editor: "Can edit",
  viewer: "Can view",
};
export type Suggestion = { id: string; title: string; className: string | null; detail: string };

const PALETTE = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6"];
function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

export function ShoppingList(p: {
  sid: string | null;
  student: string;
  owner?: string;
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
  const [confirmClear, setConfirmClear] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<"editor" | "viewer">("editor");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const delTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hh = p.initial?.household ?? "";
  const canEdit = (data?.role ?? "owner") !== "viewer";
  const isOwner = (data?.role ?? "owner") === "owner";
  const chan = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  const refresh = useCallback(async () => {
    const r = await hhListAction(hh);
    if (r.status === 200) setData(r.body as unknown as ListData);
    else if (r.status === 403) setData(null); // access revoked
  }, [hh]);

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
      () => hhUpdateAction(hh, it.id, ch),
      (d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, ...ch } : x)) }),
    );

  function add(e?: React.FormEvent, extra?: Record<string, unknown>) {
    e?.preventDefault();
    const body = extra ?? { text: text.trim(), classes: p.classes };
    if (!extra && !text.trim()) return;
    setText("");
    mutate(() => hhAddAction(hh, body));
  }
  function flash(msg: string, undo?: () => void) {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }
  // Delete is deferred 5s so Undo restores the same item (same id, assignee, notes) with no server round-trip.
  function remove(it: Item) {
    setMenu(null);
    setHidden((h) => new Set(h).add(it.id));
    const t = setTimeout(() => {
      delTimers.current.delete(it.id);
      mutate(
        () => hhDeleteAction(hh, it.id),
        (d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }),
      );
    }, 5000);
    delTimers.current.set(it.id, t);
    flash(`Deleted ${it.title}`, () => {
      clearTimeout(delTimers.current.get(it.id));
      delTimers.current.delete(it.id);
      setHidden((h) => {
        const n = new Set(h);
        n.delete(it.id);
        return n;
      });
    });
  }
  // Flush pending deletes if the page is left before the undo window closes.
  useEffect(() => {
    const timers = delTimers.current;
    const flush = () => timers.forEach((_, id) => void hhDeleteAction(hh, id));
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [hh]);
  function clearDone() {
    setConfirmClear(false);
    const n = data?.items.filter((i) => i.done).length ?? 0;
    mutate(
      () => clearDoneAction(hh),
      (d) => ({ ...d, items: d.items.filter((x) => !x.done) }),
    );
    flash(`Cleared ${n} checked item${n === 1 ? "" : "s"}`);
  }
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setShareErr(null);
    const r = await inviteAction(hh, invEmail.trim(), invRole);
    if (r.status !== 201)
      return setShareErr(r.body.error === "bad_email" ? "Enter a valid email." : "Couldn't create the invite.");
    if (typeof r.body.token === "string")
      setLinks((l) => ({ ...l, [r.body.share as string]: `${location.origin}/app/list/join?t=${r.body.token}` }));
    setInvEmail("");
    await refresh();
  }
  async function reissue(sh: Share) {
    const r = await inviteAction(hh, sh.email, sh.role);
    if (r.status === 201 && typeof r.body.token === "string")
      setLinks((l) => ({ ...l, [sh.id]: `${location.origin}/app/list/join?t=${r.body.token}` }));
  }
  async function revoke(sh: Share) {
    await revokeShareAction(hh, sh.id);
    ping();
    await refresh();
  }
  function copy(id: string) {
    void navigator.clipboard?.writeText(links[id] ?? "").catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  }

  if (!data)
    return (
      <>
        <h1>Shopping list</h1>
        <div className="panel empty" style={{ marginTop: 16 }}>
          This list isn&apos;t available. It may have been unshared, or it couldn&apos;t load. Refresh to try again.
        </div>
      </>
    );
  const visible = data.items.filter((i) => !hidden.has(i.id));
  const open = visible.filter((i) => !i.done);
  const done = visible.filter((i) => i.done);
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
    <div
      className={`lv-row ${it.done ? "lv-done" : ""}`}
      data-testid="list-item"
      // Swipe left (touch/pen) to delete; mouse users get the trash button.
      onPointerDown={(e) => {
        if (!canEdit || e.pointerType === "mouse") return;
        const el = e.currentTarget;
        const x0 = e.clientX;
        const y0 = e.clientY;
        let dx = 0;
        const move = (ev: PointerEvent) => {
          dx = Math.min(0, ev.clientX - x0);
          if (Math.abs(ev.clientY - y0) > 24 && dx > -20) return end();
          el.style.transform = `translateX(${dx}px)`;
          el.classList.toggle("lv-swiping", dx < -40);
        };
        const end = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", end);
          window.removeEventListener("pointercancel", end);
          el.style.transform = "";
          el.classList.remove("lv-swiping");
          if (dx < -90) remove(it);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
      }}
    >
      <button
        type="button"
        disabled={!canEdit}
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
              🗑 Delete
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="lv-del"
        aria-label={`Delete ${it.title}`}
        title="Delete"
        data-testid="delete-item"
        onClick={() => remove(it)}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path
            d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );

  const show = (k: "school" | "household") => tab === "all" || tab === k;
  return (
    <>
      <div className="lv-head">
        <div>
          <h1>Shopping list</h1>
          <div className="sub">
            {isOwner
              ? `Shared with ${p.student}'s family${(data.shares ?? []).some((x) => x.status === "active") ? " and others" : ""} · updates live`
              : `${p.owner ?? "A family"}'s list · you ${canEdit ? "can edit" : "can view"} · updates live`}
          </div>
        </div>
        <div className="lv-headr">
          <button
            type="button"
            className="lv-avs"
            aria-label="Members and sharing"
            onClick={() => setShareOpen(true)}
            data-testid="members"
          >
            {members.slice(0, 5).map((m) => (
              <Av key={m.profile_id} id={m.profile_id} />
            ))}
            {members.length > 5 ? <span className="lv-av more">+{members.length - 5}</span> : null}
          </button>
          <button type="button" className="lv-pill lv-share" onClick={() => setShareOpen(true)} data-testid="share">
            {isOwner ? "Share" : "Members"}
          </button>
          <span className={`lv-live ${live ? "" : "off"}`} data-testid="live">
            <i />
            {live ? `Live · ${online.size || 1} online` : "Connecting…"}
          </span>
        </div>
      </div>
      <div className={`lv-grid ${canEdit ? "" : "lv-ro"}`}>
        <div>
          <div className="lv-card">
            {!canEdit ? (
              <div className="lv-s">You can view this list. Ask the owner for edit access to change it.</div>
            ) : null}
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
              <div className="lv-cardh">
                <h3 style={{ color: "var(--dim)" }}>Checked off · {done.length}</h3>
                {canEdit ? (
                  confirmClear ? (
                    <span className="lv-confirm" role="alertdialog" aria-label="Confirm clear">
                      Delete {done.length} checked item{done.length === 1 ? "" : "s"}?
                      <button type="button" className="lv-danger" onClick={clearDone} data-testid="confirm-clear">
                        Delete
                      </button>
                      <button type="button" className="lv-ghost" onClick={() => setConfirmClear(false)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="lv-ghost"
                      onClick={() => setConfirmClear(true)}
                      data-testid="clear-checked"
                    >
                      Clear checked
                    </button>
                  )
                ) : null}
              </div>
              {done.map((it) => (
                <Row key={it.id} it={it} />
              ))}
            </div>
          ) : null}
        </div>
        <div>
          {p.sid ? (
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
          ) : null}
          <div className="lv-card">
            <h3>Who&apos;s on this list</h3>
            {members.map((m) => (
              <div className="lv-row" key={m.profile_id}>
                <Av id={m.profile_id} lg />
                <div className="lv-grow">
                  <div className="lv-t" style={{ fontSize: 14 }}>
                    {m.profile_id === data.me ? `${m.name} (you)` : m.name}
                  </div>
                  <div className="lv-s">{ROLE_LABEL[m.role] ?? "Member"}</div>
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
              Only list items are shared here, never grades, classes or messages.
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
      {shareOpen ? (
        <div className="lv-sheet-bg" onClick={() => setShareOpen(false)}>
          <div
            className="lv-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Share list"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setShareOpen(false)}
          >
            <div className="lv-cardh">
              <h3>{isOwner ? "Share this list" : "People on this list"}</h3>
              <button type="button" className="lv-ghost" aria-label="Close" onClick={() => setShareOpen(false)}>
                ✕
              </button>
            </div>
            {isOwner ? (
              <>
                <div className="lv-s" style={{ marginBottom: 10 }}>
                  Invite someone by email. Sparkle doesn&apos;t send emails. Copy the invite link and send it yourself.
                  They join when they sign in with that email. They&apos;ll only see this list, nothing else.
                </div>
                <form className="lv-add" onSubmit={invite}>
                  <input
                    className="lv-in"
                    type="email"
                    required
                    value={invEmail}
                    maxLength={254}
                    onChange={(e) => setInvEmail(e.target.value)}
                    placeholder="name@example.com"
                    aria-label="Email to invite"
                    data-testid="invite-email"
                  />
                  <select
                    className="lv-in lv-role"
                    value={invRole}
                    onChange={(e) => setInvRole(e.target.value as "editor" | "viewer")}
                    aria-label="Access"
                  >
                    <option value="editor">Can edit</option>
                    <option value="viewer">Can view</option>
                  </select>
                  <button className="lv-pill" disabled={!invEmail.trim()} data-testid="invite">
                    Create link
                  </button>
                </form>
                {shareErr ? (
                  <div className="lv-s" style={{ color: "var(--bad, #f43f5e)" }}>
                    {shareErr}
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="lv-sec">Members</div>
            {members.map((m) => {
              const sh = (data.shares ?? []).find((x) => x.member_profile_id === m.profile_id);
              return (
                <div className="lv-row" key={m.profile_id}>
                  <Av id={m.profile_id} lg />
                  <div className="lv-grow">
                    <div className="lv-t" style={{ fontSize: 14 }}>
                      {m.profile_id === data.me ? `${m.name} (you)` : m.name}
                    </div>
                    <div className="lv-s">
                      {ROLE_LABEL[m.role] ?? "Member"}
                      {sh ? ` · ${sh.email}` : ""}
                    </div>
                  </div>
                  {isOwner && sh ? (
                    <button type="button" className="lv-ghost" onClick={() => revoke(sh)} data-testid="revoke">
                      Remove
                    </button>
                  ) : null}
                </div>
              );
            })}
            {isOwner && (data.shares ?? []).some((x) => x.status === "pending") ? (
              <>
                <div className="lv-sec">Pending invites</div>
                {(data.shares ?? [])
                  .filter((x) => x.status === "pending")
                  .map((sh) => (
                    <div className="lv-row" key={sh.id} data-testid="pending-invite">
                      <span className="lv-av lg" style={{ background: "var(--soft)", color: "var(--dim)" }}>
                        ✉
                      </span>
                      <div className="lv-grow">
                        <div className="lv-t" style={{ fontSize: 14 }}>
                          {sh.email}
                        </div>
                        <div className="lv-s">
                          {ROLE_LABEL[sh.role]} · pending until they sign in
                          {links[sh.id] ? (
                            <input
                              className="lv-link"
                              readOnly
                              value={links[sh.id]}
                              aria-label="Invite link"
                              data-testid="invite-link"
                              onFocus={(e) => e.target.select()}
                            />
                          ) : null}
                        </div>
                      </div>
                      {links[sh.id] ? (
                        <button type="button" className="lv-pill" onClick={() => copy(sh.id)} data-testid="copy-link">
                          {copied === sh.id ? "Copied ✓" : "Copy link"}
                        </button>
                      ) : (
                        <button type="button" className="lv-ghost" onClick={() => reissue(sh)}>
                          New link
                        </button>
                      )}
                      <button
                        type="button"
                        className="lv-ghost"
                        onClick={() => revoke(sh)}
                        aria-label={`Cancel invite for ${sh.email}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
              </>
            ) : null}
            {!isOwner ? (
              <button
                type="button"
                className="lv-ghost"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  const r = await sharedListsAction();
                  const mine = ((r.body.lists as { household_id: string; share_id: string }[]) ?? []).find(
                    (x) => x.household_id === hh,
                  );
                  if (mine) await revokeShareAction(hh, mine.share_id);
                  location.href = "/app/list";
                }}
              >
                Leave this list
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
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
