import { GpaSimulator } from "./simulator";

export const metadata = { title: "GPA simulator", robots: { index: false } };

export default function GpaPage() {
  return (
    <div className="page stack">
      <div>
        <h1>GPA simulator</h1>
        <div className="sub">Try “what if” grades · fixed rules, never AI · nothing is saved</div>
      </div>
      <GpaSimulator />
    </div>
  );
}
