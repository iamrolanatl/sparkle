import { Pigeon } from "@/components/agent/Pigeon";
import "@/components/agent/pigeon.css";

/** Landing hero mascot: Sparkle the agent pigeon in an ops-terminal frame (CSS-only motion). */
export function AgentPigeon() {
  return (
    <div className="spk-agent">
      <div className="spk-agent-hd">
        <span>CASE 07-SPK</span>
        <span>
          <i aria-hidden /> LIVE
        </span>
      </div>
      <Pigeon size={180} pose="scan" label="Sparkle, the agent pigeon, scanning a document" />
      <pre className="spk-agent-log">{"> visor online\n> scanning homework ... OK\n> coo-ordinates locked"}</pre>
    </div>
  );
}
