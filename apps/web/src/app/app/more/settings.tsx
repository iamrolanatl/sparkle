"use client";
import { Switch, usePrefs } from "../agent-shell";

const KEYS: [string, string][] = [
  ["Ctrl/⌘ K or /", "Search, go anywhere, or ask Sparkle"],
  ["1 · 2 · 3 · 4", "Briefing · Missions · Case files · Secure line"],
  ["M", "Open More"],
  ["Esc", "Close menus"],
  ["Hold or right-click a dock icon", "Quick actions"],
];

export function SettingsPanel() {
  const [p, set] = usePrefs();
  return (
    <>
      <div className="panel" style={{ marginTop: 20, padding: 8 }}>
        <div className="ph" style={{ padding: "10px 10px 4px" }}>
          Wording &amp; look
        </div>
        <Switch
          id="set-plain"
          label="Plain wording"
          hint="Everyday words instead of agent speak (Tasks instead of Missions)"
          on={p.plain}
          set={(v) => set("plain", v)}
        />
        <Switch
          id="set-dark"
          label="Dark mode"
          hint="Ops-center dark is the default"
          on={p.dark}
          set={(v) => set("dark", v)}
        />
        <Switch
          id="set-motion"
          label="Motion & effects"
          hint="Animations, boot screen effects and the pigeon fly-by"
          on={p.motion}
          set={(v) => set("motion", v)}
        />
        <Switch
          id="set-sound"
          label="Sound cues"
          hint="Soft beeps on taps (off by default)"
          on={p.sound}
          set={(v) => set("sound", v)}
        />
        <Switch
          id="set-haptics"
          label="Haptics"
          hint="Tiny vibrations on phones that support it (off by default)"
          on={p.haptics}
          set={(v) => set("haptics", v)}
        />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="ph">Keyboard shortcuts</div>
        {KEYS.map(([k, d]) => (
          <div className="row" key={k}>
            <kbd>{k}</kbd>
            <div style={{ flex: 1, textAlign: "right", color: "var(--mut)" }}>{d}</div>
          </div>
        ))}
      </div>
    </>
  );
}
