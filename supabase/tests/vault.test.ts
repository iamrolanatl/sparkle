import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = join(__dirname, "..");
const read = (p: string) => readFileSync(join(dir, p), "utf8");

describe("Team C vault schema + RLS (FR-24)", () => {
  it("passes vault_test.sql and is idempotent", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    const files = readdirSync(join(dir, "migrations")).sort();
    for (const f of files) await db.exec(read(join("migrations", f)));
    await db.exec(
      read(
        join(
          "migrations",
          files.find((f) => f.includes("_c_vault_schema"))!,
        ),
      ),
    );
    const notices: string[] = [];
    await db.exec(read("tests/vault_test.sql"), { onNotice: (n) => notices.push(n.message ?? "") }).catch((e) => {
      throw new Error(`${e.message}\npassed so far:\n${notices.join("\n")}`);
    });
    const oks = notices.filter((n) => n.startsWith("ok - "));
    expect(oks.length).toBe(53);
    await db.close();
  }, 60_000);
});
