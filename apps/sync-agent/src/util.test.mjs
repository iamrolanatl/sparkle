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
