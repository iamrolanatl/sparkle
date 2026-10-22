// Team B / FR-23: scans table RLS + idempotency (PGlite). Sample data only.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = join(__dirname, "..");
const read = (p: string) => readFileSync(join(dir, p), "utf8");
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const SA = "10000000-0000-0000-0000-00000000000a";
const SHA = "a".repeat(64);
const as = (u: string) =>
  `set local role authenticated; select set_config('request.jwt.claim.sub','${u}',true), set_config('request.jwt.claims','{"sub":"${u}","role":"authenticated"}',true);`;

describe("scans (FR-23) RLS", () => {
  it("guardian sees own scans; other family cannot; users cannot write; uploads dedupe", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    const files = readdirSync(join(dir, "migrations")).sort();
    for (const f of files) await db.exec(read(join("migrations", f)));
    await db.exec(read(join("migrations", files.find((f) => f.includes("_b_ocr_scans"))!))); // idempotent re-run
    await db.exec(`insert into auth.users (id,email) values ('${A}','a@example.com'),('${B}','b@example.com');`);
    await db.exec(`begin; ${as(A)} insert into public.students (id,display_name,created_by) values ('${SA}','Sample A','${A}'); commit;`);
    const ins = `insert into public.scans (student_id,r2_key,sha256,content_type,size_bytes) values ('${SA}','scans/x','${SHA}','image/png',10) on conflict (student_id,sha256) do nothing`;
    await db.exec(ins);
    await db.exec(ins);
    expect((await db.query<{ n: number }>("select count(*)::int n from public.scans")).rows[0]!.n).toBe(1);

    const count = async (u: string) => {
      await db.exec(`begin; ${as(u)}`);
      const n = (await db.query<{ n: number }>("select count(*)::int n from public.scans")).rows[0]!.n;
      await db.exec("rollback");
      return n;
    };
    expect(await count(A)).toBe(1);
    expect(await count(B)).toBe(0);
    await db.exec(`begin; ${as(A)}`);
    await expect(db.exec(`update public.scans set status='saved'`)).rejects.toThrow();
    await db.exec("rollback");
    await db.exec(`begin; ${as(A)}`);
    await expect(db.exec(ins.replace(SHA, "b".repeat(64)))).rejects.toThrow();
    await db.exec("rollback");
    await db.close();
  }, 60_000);
});
