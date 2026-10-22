/**
 * Explicit-confirmation framework (WBS 3.6, ADR-04): every outbound channel (email, message, post) must call
 * sendConfirmed(). It refuses unless the draft was confirmed by a person; the DB check constraint
 * ai_drafts_sent_requires_confirmation enforces the same rule a second time.
 */
export interface Draft {
  id: string;
  body: string;
  recipient: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  sent_at: string | null;
}

export class NotConfirmedError extends Error {
  constructor(id: string) {
    super(`draft ${id} is not confirmed`);
    this.name = "NotConfirmedError";
  }
}

export async function sendConfirmed(
  draft: Draft,
  transport: (to: string, body: string) => Promise<void>,
): Promise<void> {
  if (!draft.confirmed_at || !draft.confirmed_by) throw new NotConfirmedError(draft.id);
  if (draft.sent_at) return; // idempotent: never send twice
  if (!draft.recipient) throw new Error(`draft ${draft.id} has no recipient`);
  await transport(draft.recipient, draft.body);
}
