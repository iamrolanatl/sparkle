"use client";
import { useMemo, useState } from "react";
import { SAMPLE_DOCS, type VaultClass, type SampleDoc } from "./sample";

const LABEL: Record<VaultClass, string> = { standard: "Standard", academic: "Academic", sensitive: "Sensitive" };
const CLS: Record<VaultClass, string> = { standard: "cls-std", academic: "cls-aca", sensitive: "cls-sen" };
const ICON: Record<VaultClass, string> = { standard: "📄", academic: "📊", sensitive: "🛡" };
type Log = { who: string; what: string; at: string; c: string };

export function VaultView({ student, viewer }: { student: string; viewer: string }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | VaultClass>("all");
  const [docs, setDocs] = useState<SampleDoc[]>(SAMPLE_DOCS);
  const [review, setReview] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [log, setLog] = useState<Log[]>([
    { who: viewer, what: "viewed 504 plan", at: "Today 9:12 AM", c: "var(--pill)" },
    { who: student, what: "uploaded Permission slip", at: "Today 3:41 PM", c: "#6366f1" },
    { who: "Guardian 2", what: "downloaded Q1 progress report", at: "Oct 17", c: "#f43f5e" },
    { who: viewer, what: "shared MAP report with Tutor (7 days)", at: "Oct 2", c: "var(--pill)" },
  ]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return docs.filter(
      (d) => (f === "all" || d.cls === f) && (!t || `${d.title} ${d.from} ${d.text}`.toLowerCase().includes(t)),
    );
  }, [docs, q, f]);
  const count = (c: VaultClass) => docs.filter((d) => d.cls === c).length;
  const now = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  function view(d: SampleDoc) {
    setOpen(open === d.id ? null : d.id);
    if (open !== d.id)
      setLog((l) => [{ who: viewer, what: `viewed ${d.title}`, at: `Today ${now()}`, c: "var(--pill)" }, ...l]);
  }
  function save(task: boolean) {
    setReview(false);
    setDocs((d) => [
      {
        id: "slip",
        title: "Field trip permission slip — Fernbank",
        cls: "standard",
        from: "Science · Oct 20 · due Oct 28",
        text: "permission slip fernbank field trip sign return",
      },
      ...d,
    ]);
    setSaved(
      task
        ? "Saved, and added the task “Return slip · Oct 28” (sample — not saved to Tasks)."
        : "Saved to the Vault (sample).",
    );
    setLog((l) => [
      { who: viewer, what: "reviewed and saved Permission slip", at: `Today ${now()}`, c: "var(--pill)" },
      ...l,
    ]);
  }
  const Av = ({ n, c }: { n: string; c: string }) => (
    <span className="lv-av" style={{ background: c, color: c === "var(--pill)" ? "var(--pillt)" : "#fff" }}>
      {n.charAt(0).toUpperCase()}
    </span>
  );
  return (
    <>
      <h1>Vault</h1>
      <div className="sub">
        {student}&apos;s school mail and documents · {docs.length} items
      </div>
      <div className="lv-banner" data-testid="sample-banner">
        <span>🔒</span>
        <div className="lv-grow">
          <b>Sample data · beta.</b> The Vault is off for real families until the privacy review is complete. Everything
          here is example data; nothing is uploaded or stored. Sensitive documents will be encrypted and visible to
          guardians only.
        </div>
      </div>
      <div className="lv-grid">
        <div>
          <div className="lv-card">
            <div className="lv-add">
              <input
                className="lv-in"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search letters, forms, report cards… (searches scanned text)"
                aria-label="Search the vault"
              />
            </div>
            <div className="lv-seg" style={{ marginTop: 12 }}>
              {(["all", "standard", "academic", "sensitive"] as const).map((k) => (
                <button key={k} type="button" className={f === k ? "on" : ""} onClick={() => setF(k)}>
                  {k === "all" ? `All ${docs.length}` : `${LABEL[k]} ${count(k)}`}
                </button>
              ))}
            </div>
          </div>
          {review ? (
            <div className="lv-card">
              <h3>
                Needs your review · 1<span className="spk">✦</span>
              </h3>
              <div className="lv-row lv-review" data-testid="review">
                <div className="lv-doc">📄</div>
                <div className="lv-grow">
                  <div className="lv-t">Field trip permission slip — Fernbank</div>
                  <div className="lv-s">Scanned by {student} · today 3:41 PM · read on this device</div>
                  <div className="lv-kv" style={{ marginTop: 10 }}>
                    <span>Sender</span>
                    <b>Dickerson MS · Science</b>
                    <span>Date</span>
                    <b>Oct 20, 2026</b>
                    <span>Action</span>
                    <b>Sign and return by Oct 28</b>
                    <span>Class</span>
                    <b>
                      <span className="lv-tag cls-std">Standard</span>
                    </b>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button type="button" className="lv-pill" onClick={() => save(true)}>
                      Save + add task “Return slip · Oct 28”
                    </button>
                    <button type="button" className="lv-ghost" onClick={() => save(false)}>
                      Save only
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {saved ? (
            <div className="lv-card lv-s" role="status">
              ✦ {saved}
            </div>
          ) : null}
          <div className="lv-card">
            <h3>Documents</h3>
            {shown.length ? (
              shown.map((d) => (
                <div key={d.id}>
                  <button
                    type="button"
                    className="lv-row"
                    style={{
                      width: "100%",
                      background: "none",
                      border: 0,
                      color: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                    }}
                    onClick={() => view(d)}
                    data-testid="vault-doc"
                  >
                    <div className="lv-doc">{ICON[d.cls]}</div>
                    <div className="lv-grow">
                      <div className="lv-t">{d.title}</div>
                      <div className="lv-s">
                        {d.from}
                        {d.cls === "sensitive" ? " · 🔒 encrypted" : ""}
                      </div>
                    </div>
                    <span className={`lv-tag ${CLS[d.cls]}`}>{LABEL[d.cls]}</span>
                  </button>
                  {open === d.id ? (
                    <div className="lv-s" style={{ padding: "0 0 12px 52px" }}>
                      {d.cls === "sensitive"
                        ? "Guardians only. In the live Vault you'll be asked to sign in again before it opens."
                        : `Scanned text: “${d.text}”`}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="lv-s">No documents match.</div>
            )}
          </div>
        </div>
        <div>
          <div className="lv-card">
            <h3>Add a document</h3>
            <div className="lv-drop">
              📷 Take photo · ⬆ Upload photo or PDF
              <br />
              <span className="lv-s">
                Uploads open after the privacy review. Text will be read on your device; SSNs and card numbers are
                blocked.
              </span>
            </div>
          </div>
          <div className="lv-card">
            <h3>Who can see what</h3>
            <div className="lv-kv">
              <span>
                <span className="lv-tag cls-std">Standard</span>
              </span>
              <div>Guardians, {student}, helpers with message access</div>
              <span>
                <span className="lv-tag cls-aca">Academic</span>
              </span>
              <div>Guardians, {student}, helpers with grade access</div>
              <span>
                <span className="lv-tag cls-sen">Sensitive</span>
              </span>
              <div>Guardians only. Others need a per-document share (max 30 days). Re-sign-in to open.</div>
            </div>
          </div>
          <div className="lv-card">
            <h3>Access log</h3>
            {(all ? log : log.slice(0, 3)).map((a, i) => (
              <div className="lv-row" key={i} data-testid="log-row">
                <Av n={a.who} c={a.c} />
                <div className="lv-grow lv-s">
                  <b style={{ color: "var(--fg)" }}>{a.who}</b> {a.what}
                </div>
                <span className="lv-s">{a.at}</span>
              </div>
            ))}
            <button type="button" className="lv-ghost" style={{ marginTop: 8 }} onClick={() => setAll((x) => !x)}>
              {all ? "Show less" : "View full log"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
