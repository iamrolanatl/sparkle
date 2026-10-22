import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = join(__dirname, "..");
const read = (p: string) => readFileSync(join(dir, p), "utf8");

describe("#43 student_age guard (Integration)", () => {
  it("does not leak ages across families", async () => {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(read("tests/auth_stub.sql"));
    for (const f of readdirSync(join(dir, "migrations")).sort()) await db.exec(read(join("migrations", f)));
    const notices: string[] = [];
    await db.exec(read("tests/student_age_int_test.sql"), { onNotice: (n) => notices.push(n.message ?? "") });
    expect(notices.filter((n) => n.startsWith("ok - student_age")).length).toBe(4);
    await db.close();
  }, 60_000);
});
