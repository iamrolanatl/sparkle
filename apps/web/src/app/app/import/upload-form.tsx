"use client";
import { useActionState, useState } from "react";
import { IMPORT_HEADER, preflightCsv } from "@/lib/csv-preview";
import { importCsv, type ImportResult } from "./actions";

export function UploadForm({ students }: { students: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(importCsv, null);
  const [check, setCheck] = useState<string | null>(null);
  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(`${IMPORT_HEADER}\nMath,Ms. Rivera,2,Worksheet 4.2,2026-10-23,assigned,,10\n`)}`;
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        Student
        <select name="student_id" required className="rounded-md bg-black/30 p-2">
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        CSV file
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return setCheck(null);
            const r = preflightCsv(await f.text());
            setCheck(r.ok ? `Looks good: ${r.rows} row${r.rows === 1 ? "" : "s"}.` : r.error);
          }}
        />
      </label>
      {check ? (
        <p className="text-sm" aria-live="polite">
          {check}
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <button disabled={pending} className="rounded-md bg-white/10 px-4 py-2 font-semibold">
          {pending ? "Importing…" : "Import"}
        </button>
        <a href={template} download="sparkle-import-template.csv" className="text-sm underline">
          Download template
        </a>
      </div>
      {state ? (
        <p role="status" className="text-sm">
          {state.ok ? `Imported ${state.imported} assignments across ${state.classes} classes.` : state.error}
        </p>
      ) : null}
    </form>
  );
}
