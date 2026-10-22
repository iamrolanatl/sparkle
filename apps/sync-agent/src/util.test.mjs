import { test } from "node:test";
import assert from "node:assert/strict";
import { mdy, monthDayTime, provider, isLogin, sha } from "./util.mjs";
test("dates", () => {
  assert.equal(mdy("10/21/2026"), "2026-10-21");
  assert.equal(monthDayTime("Tuesday, Oct 13 at 9:56 AM", new Date("2026-10-22")), "2026-10-13T13:56:00.000Z");
});
test("provider + login + hash", () => {
  assert.equal(provider("https://play.blooket.com/x"), "blooket");
  assert.ok(isLogin("https://login.microsoftonline.com/x"));
  assert.ok(!isLogin("https://studentvue.cobbk12.org/PXP2_Gradebook.aspx"));
  assert.equal(sha({ a: 1 }).length, 64);
});
import { pickWeek } from "./learn.mjs";
test("pickWeek", () => {
  const now = new Date(2026, 9, 22);
  assert.equal(pickWeek(["x", "Week 11 Oct 19 - 23", "Week 10 Oct 12-16"], now), 1);
  assert.equal(pickWeek(["Week 1 - 8/3 - 8/7", "Week 11 - 10/19 - 10/23", "Week 12 - 10/26 - 10/30"], now), 1);
});

import { matchRoom } from "./learn.mjs";
test("CTLS Learn rooms match co-taught classes by name + subject", () => {
  const classes = [
    { key: "sci", name: "Science 7 Q2", teacher: "Lisa Sullivan" },
    { key: "rd", name: "Reading 7 Q2", teacher: "Fallon Howes" },
    { key: "ma", name: "Math 7 Q2", teacher: "Nicole Hyden" },
  ];
  const m = (name, teacher) => matchRoom({ name, teacher }, classes)?.key ?? null;
  assert.equal(m("2nd Period - 7th Grade Reading - Mrs. Howes & Mr. Long", "Brandon Long"), "rd");
  assert.equal(m("3-Science-Sullivan/Long-26/27", "Brandon Long"), "sci");
  assert.equal(m("6th - Math 7 - Hyden/Isbell 26-27", "Nicole Hyden"), "ma");
  assert.equal(m("Math team 2026-2027", "Nicole Hyden"), null);
});

import { matchMail } from "./outlook.mjs";
test("Q1 teacher mail joins the same course this quarter", () => {
  const classes = [
    { key: "la", name: "Language Arts 7 Q2", teacher: "Jennifer Sparks", sectionNo: "448" },
    { key: "ss", name: "Soc Stdy 7Q2", teacher: "Michael Lesperance", sectionNo: "1001" },
  ];
  assert.equal(matchMail("1084 - Language Arts 7 Q1 - Gimkit Late work", "Sarah Neilly", classes)?.key, "la");
  assert.equal(matchMail("Field trip", "Lesperance, Michael", classes)?.key, "ss");
  assert.equal(matchMail("Library news", "Library", classes), null);
});

import { parseChat } from "./parent.mjs";
test("ParentSquare chat list row", () => {
  const r = parseChat("Kimberly Tuttle 2 Messages Thu 12/18/25, 10:23 am I wanted to share an update");
  assert.equal(r.sender, "Kimberly Tuttle");
  assert.equal(r.at, "2025-12-18T15:23:00.000Z");
  assert.match(r.snippet, /^I wanted/);
});

import { inferUnit } from "./infer.mjs";
test("inferred unit from assignment names", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const a = (title, d, unit = null) => ({ classKey: "rd", title, dueAt: `2026-10-${d}T23:59:00Z`, unit });
  const u = inferUnit(
    { key: "rd" },
    [a("Argument Essay Draft", "15"), a("Argument Essay Final", "20"), a("Vocab 5", "21")],
    now,
  );
  assert.equal(u.title, "Argument");
  assert.equal(u.source, "inferred");
  assert.equal(inferUnit({ key: "rd" }, [a("Unit 3: Ecology quiz", "20")], now).title, "Unit 3: Ecology quiz");
});
