import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = join(__dirname, "..");
const read = (p: string) => readFileSync(join(dir, p), "utf8");
const P = "00000000-0000-0000-0000-00000000000a"; // parent A
const S = "00000000-0000-0000-0000-0000000000a5"; // student A login
const O = "00000000-0000-0000-0000-00000000000b"; // other family
const SID = "10000000-0000-0000-0000-00000000000a";
const as = (uid: string) =>
  `set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true);` +
  `select set_config('request.jwt.claims', json_build_object('sub','${uid}','role','authenticated')::text, true);`;

describe("Team D migration: ingest provenance (DEC-166)", () => {
  it("is idempotent, labels student-uploaded grades for guardians, keeps clients read-only, isolates families", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    const files = readdirSync(join(dir, "migrations")).sort();
    for (const f of files) await db.exec(read(join("migrations", f)));
    await db.exec(
      read(
        join(
          "migrations",
          files.find((f) => f.includes("_d_ingest_provenance"))!,
        ),
      ),
    ); // re-run
    await db.exec(
      `insert into auth.users (id,email) values ('${P}','p@example.com'),('${S}','s@example.com'),('${O}','o@example.com');`,
    );
    await db.exec(`begin; ${as(P)}
      insert into public.students (id, display_name, birth_date, created_by) values ('${SID}','Student A', current_date - interval '15 years', auth.uid());
      commit;`);
    // service role (ingest worker) writes a student-uploaded grade
    await db.exec(`reset role;
      insert into public.grades (student_id, external_key, score, max_score, source, entered_by)
      values ('${SID}','mock-portal:a3',18,20,'mock-portal','student');
      insert into public.grades (student_id, external_key, score, max_score, source, entered_by)
      values ('${SID}','mock-portal:a3',19,20,'mock-portal','student') on conflict (student_id, external_key) do update set score = excluded.score;`);
    await expect(
      db.exec(`insert into public.grades (student_id, external_key, entered_by) values ('${SID}','x','hacker');`),
    ).rejects.toThrow(/grades_entered_by_chk/);

    await db.exec(`begin; ${as(P)}`);
    const seen = await db.query<{ score: string; entered_by: string; source: string }>(
      "select score::text, entered_by, source from public.grades",
    );
    expect(seen.rows).toEqual([{ score: "19", entered_by: "student", source: "mock-portal" }]);
    await expect(
      db.exec(`insert into public.grades (student_id, score, entered_by) values ('${SID}', 100, 'guardian');`),
    ).rejects.toThrow(/permission denied|row-level security/);
    await db.exec("rollback;");

    await db.exec(`begin; ${as(O)}`);
    expect((await db.query("select * from public.grades")).rows).toHaveLength(0);
    await db.exec("rollback;");
    await db.close();
  }, 60_000);
});
