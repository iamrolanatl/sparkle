import { W } from "@/components/agent/Pigeon";
import { Pigeon } from "@/components/agent/Pigeon";
import { SettingsPanel } from "./settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false } };

export default function MorePage() {
  return (
    <div className="page">
      <div className="ag-hero">
        <Pigeon size={72} pose="idle" quip="Adjust your gadgets, agent. Not the crumbs." />
      </div>
      <h1>
        <W a="Agent settings" p="Settings" />
      </h1>
      <div className="sub">Appearance, wording, sound and shortcuts</div>
      <SettingsPanel />
    </div>
  );
}
