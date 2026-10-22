import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = join(__dirname, "..");
const read = (p: string) => readFileSync(join(dir, p), "utf8");

describe("supabase migration + RLS (PGlite)", () => {
  it("applies migrations and passes rls_test.sql", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    for (const f of readdirSync(join(dir, "migrations")).sort()) await db.exec(read(join("migrations", f)));
    const notices: string[] = [];
    await db.exec(read("tests/rls_test.sql"), { onNotice: (n) => notices.push(n.message ?? "") }).catch((e) => {
      throw new Error(`${e.message}\npassed so far:\n${notices.join("\n")}`);
    });
    const oks = notices.filter((n) => n.startsWith("ok - "));
    console.log(oks.join("\n"));
    expect(oks.length).toBe(45);
    await db.close();
  }, 60_000);

  it("CR-0007: every auth.uid() in policies is wrapped in a sub-select, migration is idempotent, FKs indexed", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    const files = readdirSync(join(dir, "migrations")).sort();
    for (const f of files) await db.exec(read(join("migrations", f)));
    await db.exec(
      read(
        join(
          "migrations",
          files.find((f) => f.includes("rls_perf"))!,
        ),
      ),
    ); // re-run: idempotent
    const bare = await db.query<{ n: number }>(
      `select count(*)::int n from pg_policies where schemaname='public'
       and (regexp_replace(coalesce(qual,'') || coalesce(with_check,''), 'SELECT auth\\.uid\\(\\) AS uid', '', 'gi') ~ 'auth\\.uid\\(\\)')`,
    );
    expect(bare.rows[0].n).toBe(0);
    const doubled = await db.query<{ n: number }>(
      `select count(*)::int n from pg_policies where schemaname='public' and coalesce(qual,'') ~* 'select \\( *select auth'`,
    );
    expect(doubled.rows[0].n).toBe(0);
    const unindexed = await db.query<{ n: number }>(
      `select count(*)::int n from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace
       and not exists (select 1 from pg_index i where i.indrelid=c.conrelid and i.indkey[0]=c.conkey[1])`,
    );
    expect(unindexed.rows[0].n).toBe(0);
    await db.close();
  }, 60_000);
});
