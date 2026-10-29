"use client";
import { useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { GlassPanel } from "@sparkle/ui/GlassPanel";
import { ACCEPT, KIND_LABELS, SENSITIVE, errorMessage, fitWithin, toOcrResult, type Fields } from "@/lib/scan";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const field = "w-full rounded-lg border border-[var(--spk-border)] bg-transparent px-3 py-2";

type Step =
  | { s: "idle" }
  | { s: "reading"; pct: number }
  | { s: "uploading" }
  | { s: "processing" }
  | { s: "review"; scanId: string; text: string; fields: Fields; redactions: Record<string, number> | null }
  | { s: "vault" }
  | { s: "done"; status: "saved" | "discarded" }
  | { s: "error"; msg: string };

/** Downscale on-device (≤ 2000 px, JPEG) to keep uploads small and OCR fast. */
async function prepare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const { w, h } = fitWithin(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85));
}

export function Scanner(props: {
  students: { id: string; display_name: string }[];
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const supabase = useMemo(
    () => createBrowserClient(props.supabaseUrl, props.supabaseKey),
    [props.supabaseUrl, props.supabaseKey],
  );
  const [studentId, setStudentId] = useState(props.students[0]?.id ?? "");
  const [step, setStep] = useState<Step>({ s: "idle" });
  const input = useRef<HTMLInputElement>(null);

  async function authed(path: string, init: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("unauthorized");
    return fetch(`${API}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  }

  async function onFile(file: File | undefined) {
    if (!file || !studentId) return;
    if (!ACCEPT.includes(file.type)) return setStep({ s: "error", msg: errorMessage("unsupported_type") });
    try {
      setStep({ s: "reading", pct: 0 });
      const blob = await prepare(file);
      // On-device OCR only (DEC-127). Loaded lazily so the page stays light.
      const { createWorker } = await import("tesseract.js");
      // DEC-77: same-origin assets only (no CDN); no blob: worker so CSP can stay 'self'.
      const worker = await createWorker("eng", 1, {
        workerPath: "/scan-assets/worker.min.js",
        corePath: "/scan-assets/core",
        langPath: "/scan-assets/lang",
        workerBlobURL: false,
        gzip: true,
        logger: (m: { status: string; progress: number }) =>
          m.status === "recognizing text" && setStep({ s: "reading", pct: Math.round(m.progress * 100) }),
      });
      let data: { text: string; confidence: number };
      try {
        ({ data } = await worker.recognize(blob));
      } finally {
        // Always free the WASM worker (memory on low-end devices), even when recognize() throws.
        await worker.terminate().catch(() => undefined);
      }
      const ocr = toOcrResult(data.text, data.confidence);
      if (!ocr.text.trim()) return setStep({ s: "error", msg: errorMessage("on_device_ocr_required") });
      if (SENSITIVE.test(ocr.text)) return setStep({ s: "vault" }); // DEC-124: never uploaded to scans

      setStep({ s: "uploading" });
      const form = new FormData();
      form.append("file", new File([blob], "scan.jpg", { type: "image/jpeg" }));
      form.append("ocr", JSON.stringify(ocr));
      const r = await authed(`/students/${studentId}/scans`, {
        method: "POST",
        body: form,
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const body = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (body.error === "sensitive_use_vault") return setStep({ s: "vault" });
      if (!r.ok || !body.id) return setStep({ s: "error", msg: errorMessage(body.error) });
      await poll(body.id);
    } catch (e) {
      setStep({ s: "error", msg: errorMessage(e instanceof Error ? e.message : undefined) });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function poll(id: string) {
    setStep({ s: "processing" });
    for (let i = 0, delay = 500; i < 20; i++, delay = Math.min(delay * 1.5, 4000)) {
      const r = await authed(`/scans/${id}`);
      const row = (await r.json().catch(() => ({}))) as {
        status?: string;
        ocr_text?: string;
        fields?: Fields;
        redactions?: Record<string, number>;
        error?: string;
      };
      if (row.status === "review" && row.fields)
        return setStep({
          s: "review",
          scanId: id,
          text: row.ocr_text ?? "",
          fields: row.fields,
          redactions: row.redactions ?? null,
        });
      if (row.status === "discarded" && row.error === "sensitive_use_vault") return setStep({ s: "vault" });
      if (row.status === "failed" || row.status === "discarded")
        return setStep({ s: "error", msg: errorMessage(row.error) });
      await new Promise((res) => setTimeout(res, delay));
    }
    setStep({ s: "error", msg: "Still working on it. Check back in a minute." });
  }

  async function finish(action: "confirm" | "discard", fields?: Fields) {
    if (step.s !== "review") return;
    const r = await authed(`/scans/${step.scanId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields ?? {}),
    });
    if (!r.ok)
      return setStep({
        s: "error",
        msg: errorMessage(((await r.json().catch(() => ({}))) as { error?: string }).error),
      });
    setStep({ s: "done", status: action === "confirm" ? "saved" : "discarded" });
  }

  if (props.students.length === 0)
    return <p className="text-sm">Add a student on the Family page first, then come back to scan.</p>;

  const busy = step.s === "reading" || step.s === "uploading" || step.s === "processing";
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          Student
          <select className={field} value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={busy}>
            {props.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
        <label
          className={`spk-glow cursor-pointer rounded-full border px-4 py-2 text-center ${busy ? "opacity-50" : ""}`}
        >
          📷 Take photo or upload
          <input
            ref={input}
            type="file"
            accept={ACCEPT.join(",")}
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <div aria-live="polite">
        {step.s === "reading" ? <Status text={`Reading the text on your device… ${step.pct}%`} /> : null}
        {step.s === "uploading" ? <Status text="Uploading securely…" /> : null}
        {step.s === "processing" ? <Status text="Finding dates, amounts and details…" /> : null}
        {step.s === "error" ? (
          <p role="alert" className="text-sm text-red-400">
            {step.msg}
          </p>
        ) : null}
        {step.s === "vault" ? (
          <GlassPanel glow className="p-4 text-sm">
            This looks like an IEP, 504 or health document. To keep it safer, Sparkle doesn&apos;t store these as
            regular scans. They&apos;ll go in the secure family vault, which is coming soon. Nothing was uploaded.
          </GlassPanel>
        ) : null}
        {step.s === "done" ? (
          <p className="text-sm">{step.status === "saved" ? "Saved. ✨" : "Discarded. The photo was deleted."}</p>
        ) : null}
      </div>

      {step.s === "review" ? (
        <ReviewForm
          key={step.scanId}
          fields={step.fields}
          text={step.text}
          redactions={step.redactions}
          onConfirm={(f) => finish("confirm", f)}
          onDiscard={() => finish("discard")}
        />
      ) : null}
    </div>
  );
}

function Status({ text }: { text: string }) {
  return <p className="animate-pulse text-sm opacity-80">{text}</p>;
}

/** Human review gate (DEC-120): every suggested field is editable; nothing saves until "Looks right". */
function ReviewForm(props: {
  fields: Fields;
  text: string;
  redactions: Record<string, number> | null;
  onConfirm: (f: Fields) => void;
  onDiscard: () => void;
}) {
  const [f, setF] = useState<Fields>(props.fields);
  const [saving, setSaving] = useState(false);
  const hidden = Object.values(props.redactions ?? {}).reduce((a, b) => a + b, 0);
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <GlassPanel glow className="grid gap-3 p-4">
      <h2 className="text-lg font-semibold">Check what Sparkle found</h2>
      {hidden > 0 ? (
        <p className="text-xs opacity-80">
          🔒 {hidden} sensitive number{hidden > 1 ? "s were" : " was"} hidden automatically.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Type
          <select className={field} value={f.kind} onChange={(e) => set("kind", e.target.value as Fields["kind"])}>
            {Object.entries(KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Title
          <input
            className={field}
            maxLength={200}
            value={f.title ?? ""}
            onChange={(e) => set("title", e.target.value || null)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          School
          <input
            className={field}
            maxLength={200}
            value={f.school ?? ""}
            onChange={(e) => set("school", e.target.value || null)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Due date
          <input
            type="date"
            className={field}
            value={f.dueDate ?? ""}
            onChange={(e) => set("dueDate", e.target.value || null)}
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Amounts
          <input
            className={field}
            value={f.amounts.join(", ")}
            onChange={(e) =>
              set(
                "amounts",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={f.signatureRequired}
            onChange={(e) => set("signatureRequired", e.target.checked)}
          />
          Needs a parent signature
        </label>
      </div>
      {f.dates.length ? <p className="text-xs opacity-80">Other dates found: {f.dates.join(", ")}</p> : null}
      <details className="text-xs opacity-80">
        <summary className="cursor-pointer">Show the text Sparkle read</summary>
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap">{props.text}</pre>
      </details>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          className="spk-magnetic mag rounded-full border px-4 py-2"
          onClick={() => {
            setSaving(true);
            props.onConfirm(f);
          }}
        >
          {saving ? "Saving…" : "Looks right, save"}
        </button>
        <button
          type="button"
          disabled={saving}
          className="rounded-full px-4 py-2 text-sm opacity-80 hover:opacity-100"
          onClick={props.onDiscard}
        >
          Discard
        </button>
      </div>
    </GlassPanel>
  );
}
