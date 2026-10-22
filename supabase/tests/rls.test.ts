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
});
