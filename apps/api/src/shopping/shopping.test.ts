import { describe, expect, it } from "vitest";
import { parseItem } from "./parse";
import { supplyTitle } from "./route";
import app from "../index";

describe("parseItem (FR-08)", () => {
  it("parses quantity, class and category", () => {
    expect(parseItem("2 composition notebooks for ELA", ["ELA 7"])).toEqual({
      title: "Composition notebooks",
      quantity: 2,
      category: "school",
      classLabel: "ELA 7",
    });
    expect(parseItem("milk")).toMatchObject({ title: "Milk", quantity: 1, category: "household", classLabel: null });
    expect(parseItem("bananas x6").quantity).toBe(6);
    expect(parseItem("two glue sticks")).toMatchObject({ quantity: 2, category: "school" });
    expect(parseItem("5000 pens").quantity).toBe(999);
  });
});

describe("supplyTitle", () => {
  it("extracts concrete supplies from teacher posts", () => {
    expect(supplyTitle("Bring a calculator Friday")).toBe("Calculator");
    expect(supplyTitle("Please bring colored pencils for the lab.")).toBe("Colored pencils");
    expect(supplyTitle("Bring your signed permission slip tomorrow")).toBeNull();
    expect(supplyTitle("Quiz on Friday")).toBeNull();
  });
});

describe("shopping routes auth", () => {
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "k" };
  it("rejects bad ids and missing auth", async () => {
    expect((await app.request("/students/nope/list", {}, env)).status).toBe(400);
    expect((await app.request("/students/00000000-0000-0000-0000-000000000001/list", {}, env)).status).toBe(401);
  });
});

import { matchClass } from "./parse";
describe("class shorthand", () => {
  const C = ["Int Chorus 7 Q2", "Language Arts 7 Q2", "Math 7 Q2", "Phys Ed 7Q2", "Reading 7 Q2", "Science 7 Q2", "Soc Stdy 7Q2"];
  it.each([["ELA","Language Arts 7 Q2"],["LA","Language Arts 7 Q2"],["SS","Soc Stdy 7Q2"],["Sci","Science 7 Q2"],["Math","Math 7 Q2"],["PE","Phys Ed 7Q2"]])("%s", (k, v) => expect(matchClass(k, C)).toBe(v));
  it("parse uses real name", () => expect(parseItem("2 folders for SS", C).classLabel).toBe("Soc Stdy 7Q2"));
  it("no classes keeps typed", () => expect(parseItem("glue for ELA").classLabel).toBe("ELA"));
});
