// Team B / FR-23: scans table RLS, DEC-06 limits, idempotency, purge (PGlite). Sample data only.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = join(__dirname, "..");
const read = (p: string) => readFileSync(join(dir, p), "utf8");
const A = "00000000-0000-0000-0000-00000000000a";
const A5 = "00000000-0000-0000-0000-0000000000a5";
const B = "00000000-0000-0000-0000-00000000000b";
const SA = "10000000-0000-0000-0000-00000000000a";
const SHA = "a".repeat(64);
const as = (u: string) =>
  `set local role authenticated; select set_config('request.jwt.claim.sub','${u}',true), set_config('request.jwt.claims','{"sub":"${u}","role":"authenticated"}',true);`;

describe("scans (FR-23)", () => {
  it("RLS, DEC-06 limit, dedupe, write denial, client_text rule, updated_at trigger, purge", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    const files = readdirSync(join(dir, "migrations")).sort();
    for (const f of files) await db.exec(read(join("migrations", f)));
    await db.exec(
      read(
        join(
          "migrations",
          files.find((f) => f.includes("_b_ocr_scans"))!,
        ),
      ),
    ); // idempotent
    await db.exec(
      `insert into auth.users (id,email) values ('${A}','a@example.com'),('${A5}','s@example.com'),('${B}','b@example.com');`,
    );
    await db.exec(`begin; ${as(A)}
      insert into public.students (id,display_name,birth_date,created_by) values ('${SA}','Sample A', current_date - interval '15 years','${A}');
      commit;`);
    await db.exec(`update public.students set profile_id='${A5}' where id='${SA}'`);
    const ins = (sha: string) =>
      `insert into public.scans (student_id,r2_key,sha256,content_type,size_bytes,client_text) values ('${SA}','scans/${sha}','${sha}','image/png',10,'x') on conflict (student_id,sha256) do nothing`;
    await db.exec(ins(SHA));
    await db.exec(ins(SHA));
    const n = async (sql: string) => (await db.query<{ n: number }>(sql)).rows[0]!.n;
    expect(await n("select count(*)::int n from public.scans")).toBe(1);

    const visible = async (u: string) => {
      await db.exec(`begin; ${as(u)}`);
      const v = await n("select count(*)::int n from public.scans");
      await db.exec("rollback");
      return v;
    };
    expect(await visible(A)).toBe(1);
    expect(await visible(A5)).toBe(1);
    expect(await visible(B)).toBe(0);
    // DEC-06: student (15, over threshold 13) limits 'resources' -> guardian loses access, student keeps it.
    await db.exec(
      `insert into public.guardian_access_limits (student_id,scope,limited_by) values ('${SA}','resources','${A5}')`,
    );
    expect(await visible(A)).toBe(0);
    expect(await visible(A5)).toBe(1);

    for (const sql of [`update public.scans set status='saved'`, ins("b".repeat(64))]) {
      await db.exec(`begin; ${as(A5)}`);
      await expect(db.exec(sql)).rejects.toThrow();
      await db.exec("rollback");
    }
    // client_text must be cleared once processed
    await expect(db.exec(`update public.scans set status='review'`)).rejects.toThrow();
    await db.exec(`update public.scans set status='review', client_text=null, updated_at = now() - interval '40 days'`);
    expect(await n("select count(*)::int n from public.scans where updated_at > now() - interval '1 minute'")).toBe(1); // trigger
    await db.exec(
      `alter table public.scans disable trigger scans_touch; update public.scans set updated_at = now() - interval '31 days'; alter table public.scans enable trigger scans_touch;`,
    );
    expect(await n("select count(*)::int n from public.scans_due_for_purge(10)")).toBe(1);
    await db.exec(
      `alter table public.scans disable trigger scans_touch; update public.scans set status='saved'; alter table public.scans enable trigger scans_touch;`,
    );
    expect(await n("select count(*)::int n from public.scans_due_for_purge(10)")).toBe(0);
    await db.exec(`begin; ${as(A)}`);
    await expect(db.exec("select * from public.scans_due_for_purge(10)")).rejects.toThrow();
    await db.exec("rollback");
    await db.close();
  }, 60_000);
});
