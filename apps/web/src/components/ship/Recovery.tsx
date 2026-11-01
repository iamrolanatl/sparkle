"use client";
import { useState } from "react";
import { recoveryPlan, type RecoveryInput } from "@/lib/ship/derive";

/** Recovery mission: a short plan and a copy-ready teacher email. Never sends anything. */
export default function Recovery(p: RecoveryInput) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const r = recoveryPlan(p);
  const [text, setText] = useState(r.email);
  if (!p.missing.length && (p.pct == null || p.pct >= 80)) return null;
  return (
    <div className="blk sh-recovery" data-testid="recovery">
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide recovery mission" : "Start recovery mission"}
      </button>
      {open ? (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div>
            <h4>Plan</h4>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {r.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <h4>Ask the teacher</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {r.ask.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Email to copy · subject: {r.subject}</h4>
            <textarea
              aria-label="Email text (edit before copying)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              style={{ width: "100%", font: "inherit", fontSize: 13 }}
            />
            <button
              type="button"
              className="btn"
              onClick={() =>
                navigator.clipboard?.writeText(`Subject: ${r.subject}\n\n${text}`).then(() => setCopied(true))
              }
            >
              {copied ? "Copied" : "Copy email"}
            </button>
            <div style={{ color: "var(--mut)", fontSize: 12, marginTop: 4 }}>
              Edit as needed. Sparkle never sends this. Paste it into your own email to the teacher.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
