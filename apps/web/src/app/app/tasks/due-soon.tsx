import { ErrorBoundary } from "@sparkle/ui/ErrorBoundary";
import { NeonWindow } from "@sparkle/ui/NeonWindow";
import { dueSoonAction } from "./actions";
import { backlogText, reminderText, type DueSoonBody } from "./reminders";

/** Embeddable in the Today view (interface-change #66). Never throws: degrades to a quiet message. */
export async function DueSoonTasks({ studentId }: { studentId: string }) {
  const r = await dueSoonAction(studentId);
  const d = r.status === 200 ? (r.body as unknown as DueSoonBody) : null;
  return (
    <ErrorBoundary name="due-soon">
      <NeonWindow title="Coming up">
        {!d ? (
          <p className="text-muted text-sm">Tasks are taking a break. Check back in a minute.</p>
        ) : d.reminders.length === 0 && d.dueSoon.length === 0 ? (
          <p className="text-muted text-sm">Nothing due in the next two days. ✨</p>
        ) : (
          <ul className="space-y-2" aria-label="Task reminders">
            {d.reminders.map((x) => (
              <li
                key={x.taskId + x.kind}
                className="rounded-lg border border-[var(--spk-border)] px-3 py-2 transition-colors hover:border-[var(--spk-neon)]"
              >
                {reminderText(x)}
              </li>
            ))}
            {d.dueSoon
              .filter((t) => !d.reminders.some((x) => x.taskId === t.id))
              .map((t) => (
                <li key={t.id} className="text-muted px-3 text-sm">
                  {t.title}
                </li>
              ))}
            {(() => {
              const more = backlogText(d.overdueCount ?? 0, d.reminders.filter((x) => x.kind === "overdue").length);
              return more ? (
                <li className="text-muted px-3 text-sm">
                  <a className="hover:text-neon" href="/app/tasks">
                    {more}
                  </a>
                </li>
              ) : null;
            })()}
          </ul>
        )}
      </NeonWindow>
    </ErrorBoundary>
  );
}
