import Link from "next/link";
import { GlassPanel } from "@sparkle/ui/GlassPanel";

export default function AdminHome() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/admin/chat">
        <GlassPanel className="p-5">
          <h2 className="font-semibold">Sales &amp; Support Chat</h2>
          <p className="text-muted text-sm">Sessions, transcripts, flags, tickets, usage, kill switch.</p>
        </GlassPanel>
      </Link>
      <Link href="/admin/privacy">
        <GlassPanel className="p-5">
          <h2 className="font-semibold">Privacy requests</h2>
          <p className="text-muted text-sm">CCPA/CPRA requests incl. GPC opt-outs.</p>
        </GlassPanel>
      </Link>
      <Link href="/admin/sync">
        <GlassPanel className="p-5">
          <h2 className="font-semibold">Sync health</h2>
          <p className="text-muted text-sm">Imports and connector runs by source, success rate, p95.</p>
        </GlassPanel>
      </Link>
    </div>
  );
}
