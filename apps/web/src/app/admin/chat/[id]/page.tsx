import { GlassPanel } from "@sparkle/ui";
import { adminDb, audit, requireAdmin } from "@/lib/admin";

export default async function Transcript({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin();
  await audit(user.id, "chat_transcript_viewed", id);
  const { data } = await adminDb()
    .from("chat_messages")
    .select("role, content_redacted, flagged, created_at, tokens_in, tokens_out")
    .eq("session_id", id)
    .order("created_at");
  return (
    <GlassPanel className="p-4">
      <h2 className="mb-3 font-semibold">Transcript (redacted)</h2>
      <ol className="flex flex-col gap-2 text-sm">
        {(data ?? []).map((m, i) => (
          <li key={i} className={m.role === "user" ? "" : "text-muted"}>
            <span className="font-mono text-xs">
              {m.role}
              {m.flagged ? " ⚑" : ""}
            </span>{" "}
            {m.content_redacted}
          </li>
        ))}
      </ol>
    </GlassPanel>
  );
}
