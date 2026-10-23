import type { ClassView } from "./load";
import { daysUntil, dueText } from "./due";

export type AppletClass = {
  id: string;
  name: string;
  teacher: string | null;
  color: string;
  pct: number | null;
  letter: string | null;
  room: string | null;
  unit: string | null;
  tasks: { id: string; title: string; when: string; chip: string }[];
  post: { title: string; body: string | null; who: string | null } | null;
};

/** Slim, serializable view of each class for the applet windows. */
export function toApplets(classes: ClassView[], now = new Date()): AppletClass[] {
  return classes.map((c) => {
    const p = c.feed.find((f) => f.kind === "post") ?? c.feed[0];
    return {
      id: c.id,
      name: c.name,
      teacher: c.teacher,
      color: c.color,
      pct: c.pct,
      letter: c.letter,
      room: [c.room, c.period].filter(Boolean).join(" · ") || null,
      unit: c.unit?.title ?? null,
      tasks: c.upcoming
        .filter((a) => !a.due_at || daysUntil(a.due_at, now) >= 0)
        .map((a) => ({ id: a.id, title: a.title, when: dueText(a.due_at, now), chip: a.category ?? "Assignment" })),
      post: p ? { title: p.title, body: p.body, who: p.who } : null,
    };
  });
}
