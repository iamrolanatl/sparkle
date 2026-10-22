/**
 * "What your teacher wants you to do" (per class) and "Don't miss" (Today), built from class-board action items
 * (teacher post summaries, pending SA-A1), missing work, grade and current unit. Pure + deterministic: the only AI
 * step is the server-side per-post extraction; this file only ranks and phrases.
 */
export type ActionKind = "todo" | "due" | "bring" | "assessment" | "reminder" | "change" | "announcement";
export interface PostAction {
  id: string;
  post_id: string;
  class_id: string | null;
  kind: ActionKind;
  text: string;
  due_at: string | null;
  done_at: string | null;
  method: string;
}
export interface BoardPost {
  id: string;
  class_id: string | null;
  title: string;
  url: string | null;
  posted_at: string | null;
  read: boolean;
}
export interface GuidanceItem {
  id: string;
  kind: ActionKind;
  text: string;
  dueAt: string | null;
  done: boolean;
  /** not done and due within 48 h or already past */
  flagged: boolean;
  post: { id: string; title: string; url: string | null; postedAt: string | null; read: boolean };
}
export interface Guidance {
  lines: string[];
  items: GuidanceItem[];
  unread: number;
}
const DAY = 86_400_000;
const RANK: Record<ActionKind, number> = {
  assessment: 0,
  due: 1,
  bring: 2,
  todo: 3,
  change: 4,
  reminder: 5,
  announcement: 6,
};
const short = (iso: string, now: number) => {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - now) / DAY);
  const wd = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
  return days >= 0 && days < 7 ? `${wd} ${md}` : md;
};

/** Open, relevant items for one class: due from 3 days ago on, or undated from a post in the last 10 days. */
export function classItems(actions: PostAction[], posts: BoardPost[], now = Date.now()): GuidanceItem[] {
  const byId = new Map(posts.map((p) => [p.id, p]));
  return actions
    .flatMap((a) => {
      const p = byId.get(a.post_id);
      if (!p) return [];
      const posted = p.posted_at ? Date.parse(p.posted_at) : 0;
      const due = a.due_at ? Date.parse(a.due_at) : null;
      const relevant = due != null ? due >= now - 3 * DAY && due <= now + 21 * DAY : now - posted <= 10 * DAY;
      if (!relevant || a.kind === "announcement") return [];
      const done = !!a.done_at;
      return [
        {
          id: a.id,
          kind: a.kind,
          text: a.text,
          dueAt: a.due_at,
          done,
          flagged: !done && due != null && due - now < 2 * DAY,
          post: { id: p.id, title: p.title, url: p.url, postedAt: p.posted_at, read: p.read },
        },
      ];
    })
    .sort(
      (x, y) =>
        Number(x.done) - Number(y.done) ||
        (x.dueAt ? Date.parse(x.dueAt) : Infinity) - (y.dueAt ? Date.parse(y.dueAt) : Infinity) ||
        RANK[x.kind] - RANK[y.kind],
    )
    .slice(0, 6);
}

export function classGuidance(
  c: { pct: number | null; missing: { title: string }[]; unit: { title: string } | null },
  items: GuidanceItem[],
  unread: number,
  now = Date.now(),
): Guidance {
  const lines: string[] = [];
  const open = items.filter((i) => !i.done);
  if (c.missing.length)
    lines.push(
      `Turn in ${c.missing.length} missing assignment${c.missing.length > 1 ? "s" : ""} first — start with “${c.missing[0]!.title}”.`,
    );
  const test = open.find((i) => i.kind === "assessment");
  if (test) lines.push(`Get ready: ${test.text}${test.dueAt ? ` (${short(test.dueAt, now)})` : ""}.`);
  const due = open.find((i) => i.kind !== "assessment" && i.dueAt && Date.parse(i.dueAt) >= now - DAY);
  if (due) lines.push(`Next due: ${due.text} — ${short(due.dueAt!, now)}.`);
  const bring = open.find((i) => i.kind === "bring");
  if (bring && lines.length < 3) lines.push(`Bring: ${bring.text.replace(/^bring\s+/i, "")}.`);
  if (unread) lines.push(`${unread} new class-board post${unread > 1 ? "s" : ""} you haven’t opened yet.`);
  if (c.pct != null && c.pct < 80 && c.missing.length)
    lines.push(`You’re at ${c.pct.toFixed(1)}% — finishing missing work is the fastest way to raise it.`);
  if (!lines.length && c.unit) lines.push(`You’re all caught up. This week: ${c.unit.title}.`);
  return { lines: lines.slice(0, 4).map((l) => l.replace(/\.\.$/, ".")), items, unread };
}

export interface DontMiss {
  key: string;
  classId: string;
  className: string;
  color: string;
  text: string;
  when: string | null;
  kind: ActionKind | "missing";
  url: string | null;
  postTitle: string | null;
  flagged: boolean;
}
/** Cross-class Today list: missing work, then flagged/dated items in the next 7 days, then tests. */
export function dontMiss(
  classes: { id: string; name: string; color: string; missing: { title: string }[]; guidance: Guidance }[],
  now = Date.now(),
  max = 7,
): DontMiss[] {
  const out: (DontMiss & { sort: number })[] = [];
  for (const c of classes) {
    if (c.missing.length)
      out.push({
        key: `m-${c.id}`,
        classId: c.id,
        className: c.name,
        color: c.color,
        text: `${c.missing.length} missing: ${c.missing[0]!.title}${c.missing.length > 1 ? ` +${c.missing.length - 1} more` : ""}`,
        when: null,
        kind: "missing",
        url: null,
        postTitle: null,
        flagged: true,
        sort: -1,
      });
    for (const i of c.guidance.items) {
      if (i.done) continue;
      const due = i.dueAt ? Date.parse(i.dueAt) : null;
      const soon = due != null && due >= now - DAY && due <= now + 7 * DAY;
      if (!soon && i.kind !== "assessment") continue;
      out.push({
        key: i.id,
        classId: c.id,
        className: c.name,
        color: c.color,
        text: i.text,
        when: i.dueAt ? short(i.dueAt, now) : null,
        kind: i.kind,
        url: i.post.url,
        postTitle: i.post.title,
        flagged: i.flagged,
        sort: due ?? now + 6 * DAY,
      });
    }
  }
  return out
    .sort((a, b) => a.sort - b.sort)
    .slice(0, max)
    .map((r) => {
      const { sort, ...rest } = r;
      void sort;
      return rest;
    });
}

export const FROM_POST = "From teacher post";
const words = (s: string) =>
  new Set(
    (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !/^(due|the|and|at|on|for|oct|nov|dec|sep)$/.test(w)),
  );
/** Open, dated, not-yet-past teacher-post items as Upcoming rows; skipped when a portal assignment already covers it. */
export function postUpcoming(
  actions: PostAction[],
  assignments: { title: string; due_at: string | null }[],
  now = Date.now(),
): { id: string; title: string; due_at: string; status: string; category: string }[] {
  const seen = new Set<string>();
  return actions
    .filter((a) => a.due_at && !a.done_at && Date.parse(a.due_at) >= now - 12 * 3_600_000 && a.kind !== "announcement")
    .filter((a) => {
      const w = words(a.text);
      const dup = assignments.some((x) => {
        const xw = words(x.title);
        const hit = [...w].filter((k) => xw.has(k)).length;
        return hit >= Math.min(2, xw.size) && hit > 0;
      });
      const key = `${a.text.toLowerCase()}|${a.due_at}`;
      if (dup || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => ({
      id: `pa-${a.id}`,
      title: a.text,
      due_at: a.due_at!,
      status: "assigned",
      category: a.kind === "assessment" ? "Test/quiz · from teacher post" : FROM_POST,
    }));
}
