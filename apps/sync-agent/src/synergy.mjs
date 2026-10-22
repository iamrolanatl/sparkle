import { clean, isLogin, mdy, pause } from "./util.mjs";

/**
 * StudentVUE (Synergy) adapter. Read-only: page loads + the same JSON calls the page itself makes.
 * Returns { status, classes, assignments, categories, snapshots, attendance, terms, teachers }.
 */
export async function pullSynergy(ctx, { base = "https://studentvue.cobbk12.org", jobs }) {
  const p = await ctx.newPage();
  const out = {
    classes: [],
    assignments: [],
    categories: [],
    snapshots: [],
    attendance: [],
    terms: [],
    teachers: [],
    aliases: [],
  };
  try {
    await p.goto(`${base}/PXP2_ClassSchedule.aspx?AGU=0`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await p.waitForTimeout(3000);
    if (isLogin(p.url())) return { status: "needs_login", ...out };
    const text = await p.evaluate(() => document.body.innerText);
    const termName = /Q[1-4]/.exec(text.match(/\d\d:\s+[\d.]+ .+? Q([1-4])/)?.[0] ?? "")?.[0] ?? "Q2";
    const year = (() => {
      const d = new Date();
      const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
      return `${y}-${String(y + 1).slice(2)}`;
    })();
    const termKey = `${year}:${termName}`;
    out.terms.push({ externalId: termKey, schoolYear: year, name: termName });
    // "06:\t27.1220009 Math 7 Q2 - 1448\nHyden, Nicole \nRoom: 7A2"
    const re = /^(\d\d):\s+([\d.]+)\s+(.+?)\s+-\s+(\d+)\s*\n\s*([^\n]+?)\s*\n\s*Room:\s*([^\n]*)/gm;
    const seen = new Set();
    for (const m of text.matchAll(re)) {
      const [, period, courseCode, title, section, teacherRaw, room] = m;
      const key = `sec:${Number(section)}`;
      if (seen.has(key) || /homeroom/i.test(title)) continue;
      seen.add(key);
      const [last, first] = teacherRaw.split(",").map((x) => clean(x));
      const teacher = clean(`${first ?? ""} ${last}`);
      const teacherKey = `t:${last.toLowerCase()}:${(first ?? "").toLowerCase()}`;
      if (!out.teachers.find((t) => t.externalId === teacherKey))
        out.teachers.push({ externalId: teacherKey, name: teacher, aliases: [teacherRaw.trim()] });
      out.classes.push({
        key,
        name: title.trim(),
        teacher,
        teacherKey,
        period: String(Number(period)),
        room: clean(room),
        courseCode,
        sectionNo: String(Number(section)),
        termKey,
      });
    }
    if (!out.classes.length) return { status: "error", detail: "schedule_parse_empty", ...out };

    if (jobs.has("grades")) await gradebook(p, base, out);
    if (jobs.has("attendance")) await attendance(p, base, out);
    return { status: "ok", ...out };
  } finally {
    await p.close().catch(() => {});
  }
}

async function gradebook(p, base, out) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  for (const c of out.classes) {
    let cap = {};
    const mine = (name) => typeof name === "string" && name.includes(`(${c.period})`);
    const onResp = async (r) => {
      const u = r.url();
      try {
        if (u.includes("classdata-GetClassData")) {
          const j = await r.json();
          if (mine(j.className)) cap.classdata = j;
        } else if (u.includes("course.content.items-LoadWithOptions")) cap.items = await r.json();
        else if (u.includes("course.grade.card-get")) {
          const j = await r.json();
          if (mine(j.className)) cap.card = j;
        }
      } catch {}
    };
    p.on("response", onResp);
    try {
      await p.goto(`${base}/PXP2_Gradebook.aspx?AGU=0`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(3000);
      // Class rows read "6: Math 7 Q2" — click by period + title.
      const label = p.getByText(`${c.period}: ${c.name}`, { exact: false }).first();
      if (!(await label.count())) continue;
      cap = {};
      await label.click();
      for (let i = 0; i < 20 && !(cap.items && cap.classdata && cap.card); i++) await p.waitForTimeout(500);
    } catch {
      continue;
    } finally {
      p.off("response", onResp);
    }
    const cd = cap.classdata;
    const st = cd?.students?.[0];
    if (cd) {
      out.aliases.push({ externalId: String(cd.classId), classKey: c.key, source: "studentvue", label: cd.className });
      const card = cap.card;
      const pct =
        card && card.classGrade && card.classGrade !== "N/A"
          ? Number(String(card.classPct || card.classGrade).replace("%", ""))
          : st && st.calculatedMark !== "N/A"
            ? Number(st.percentage)
            : null;
      c.mark = card?.classGrade ?? st?.calculatedMark ?? null;
      c.pct = Number.isFinite(pct) ? pct : null;
    }
    const groups = cap.items?.responseData?.data ?? [];
    const items = groups.flatMap((g) => g.items ?? []);
    c.missingCount = items.filter((i) => i.isMissing).length;
    out.snapshots.push({
      classKey: c.key,
      day: today,
      pct: c.pct ?? null,
      mark: c.mark ?? null,
      missingCount: c.missingCount,
    });
    const byCat = new Map();
    for (const i of items) {
      const max = Number(i.pointsPossible);
      const pts = i.points === "" || i.points == null ? null : Number(i.points);
      const graded = i.gradeMark !== "" && i.gradeMark != null && pts !== null && Number.isFinite(pts);
      const pct = Number(String(i.calcValue ?? "").replace("%", ""));
      out.assignments.push({
        externalId: `sv:${i.itemID ?? i.xrefID}`,
        classKey: c.key,
        source: "studentvue",
        title: clean(i.title),
        dueAt: i.due_date ? new Date(`${i.due_date.slice(0, 10)}T23:59:00-04:00`).toISOString() : null,
        category: clean(i.assignmentType) || null,
        maxScore: Number.isFinite(max) ? max : null,
        score: graded ? pts : null,
        pct: graded && Number.isFinite(pct) ? pct : null,
        status: i.isMissing ? "missing" : graded ? "graded" : "assigned",
        isMissing: !!i.isMissing,
        comment: clean(i.commentText) || null,
        unit: i.unit && i.unit !== "N/A" ? i.unit : null,
      });
      if (graded && max > 0) {
        const k = clean(i.assignmentType);
        const a = byCat.get(k) ?? { pts: 0, max: 0 };
        a.pts += pts;
        a.max += max;
        byCat.set(k, a);
      }
    }
    for (const m of cd?.measureTypes ?? []) {
      const sc = byCat.get(clean(m.name));
      if (!(Number(m.weight) > 0) && !sc) continue;
      out.categories.push({
        classKey: c.key,
        name: clean(m.name).slice(0, 60),
        weight: Number(m.weight) || 0,
        dropScores: m.dropScores ?? 0,
        score: sc ? Math.round((sc.pts / sc.max) * 1000) / 10 : null,
      });
    }
    // categories used by items but absent from measureTypes (teacher-specific names)
    for (const [k, sc] of byCat)
      if (!out.categories.find((x) => x.classKey === c.key && x.name === k))
        out.categories.push({
          classKey: c.key,
          name: k.slice(0, 60),
          weight: 0,
          score: Math.round((sc.pts / sc.max) * 1000) / 10,
        });
    await pause();
  }
}

async function attendance(p, base, out) {
  await p.goto(`${base}/PXP2_Attendance.aspx?AGU=0`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(3000);
  const text = await p.evaluate(() => document.body.innerText);
  const start = text.indexOf("Totals By Course:");
  if (start < 0) return;
  let course = null;
  const end = text.indexOf("Totals By Period", start); // per-period tables repeat the same events
  const seenKeys = new Set();
  let fresh = false; // a "Date StartTime ..." header belongs to the course above it only once
  for (const line of text.slice(start, end > 0 ? end : undefined).split("\n")) {
    const cols = line.split("\t").map((x) => x.trim());
    const head = cols.filter(Boolean);
    if (head.length === 6 && /^\d+$/.test(head[1]) && !mdy(head[0])) {
      course = head[0];
      continue;
    }
    const d = mdy(cols[0]);
    if (d && course) {
      const rest = cols
        .slice(1)
        .filter(Boolean)
        .filter((x) => !/^\d{1,2}:\d\d [AP]M$/.test(x));
      const code = rest[0] ?? "Absent";
      const reason = rest[1] ?? null;
      const cls = out.classes.find(
        (c) =>
          course.toLowerCase().startsWith(c.name.toLowerCase().replace(/ q\d$/i, "")) &&
          course.endsWith(c.name.slice(-2)),
      );
      const ek = `sv:${d}:${course}:${code}`;
      if (seenKeys.has(ek)) continue;
      seenKeys.add(ek);
      out.attendance.push({
        externalId: `sv:${d}:${course}:${code}`.slice(0, 200).replace(/[^\w.:@/-]/g, "_"),
        day: d,
        courseName: course,
        code,
        reason,
        excused: /unexc/i.test(reason ?? code) ? false : /exc/i.test(reason ?? code) ? true : null,
        classKey: cls?.key ?? null,
        source: "studentvue",
        period: /homeroom/i.test(course) ? "HR" : (cls?.period ?? null),
      });
    }
  }
}
