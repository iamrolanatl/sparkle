// Team E (DEC-188): student_age() must not leak another family's child's age.
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
const as = (u: string) =>
  `set local role authenticated; select set_config('request.jwt.claim.sub','${u}',true), set_config('request.jwt.claims','{"sub":"${u}","role":"authenticated"}',true);`;

describe("student_age guard (DEC-188)", () => {
  it("guardian sees age, other family gets null, service context unchanged", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    for (const f of readdirSync(join(dir, "migrations")).sort()) await db.exec(read(join("migrations", f)));
    await db.exec(`insert into auth.users (id,email) values ('${A}','a@example.com'),('${B}','b@example.com');`);
    await db.exec(
      `begin; ${as(A)} insert into public.students (id,display_name,birth_date,created_by) values ('${SA}','Sample A', current_date - interval '15 years','${A}'); commit;`,
    );
    const age = async (u: string | null) => {
      await db.exec(`begin; ${u ? as(u) : ""}`);
      const r = (await db.query<{ a: number | null }>(`select public.student_age('${SA}') a`)).rows[0]!.a;
      await db.exec("rollback");
      return r;
    };
    expect(await age(A)).toBe(15);
    expect(await age(B)).toBeNull();
    expect(await age(null)).toBe(15);
    // Threshold logic for the guardian still works (used by can_view_student / invitations).
    await db.exec(`begin; ${as(A)}`);
    const t = await db.query<{ v: boolean }>(`select public.student_at_or_over_threshold('${SA}') v`);
    await db.exec("rollback");
    expect(typeof t.rows[0]!.v).toBe("boolean");
    await db.close();
  }, 60_000);
});
