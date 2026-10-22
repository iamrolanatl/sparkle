import { clean, isLogin, lastName, pause, provider, sha } from "./util.mjs";

const HOME = "https://studentportal.educationincites.com/#/Home";
const WEEK = /^Week\s+\d+\b.*$/i;
const NOISE =
  /^(monday|tuesday|wednesday|thursday|friday|homework:?|hw:.*|quiz practice|class board|welcome!?|instructor\(s\))$/i;

/**
 * CTLS Learn (Education Incites) adapter. API payloads are encrypted client-side, so this reads the rendered page.
 * Per class: current week + daily topics (→ current unit), board links (practice/resources), syllabus/eBook links.
 */
export async function pullLearn(ctx, classes) {
  const p = await ctx.newPage();
  const out = { units: [], resources: [], aliases: [], posts: [], classPatch: {} };
  try {
    await p.goto("https://ctlslearn.cobbk12.org/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(6000);
    if (isLogin(p.url())) return { status: "needs_login", ...out };
    await p.goto(HOME, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(5000);
    if (isLogin(p.url())) return { status: "needs_login", ...out };
    const body = await p.evaluate(() => document.body.innerText);
    // "Class name\nInstructor(s)\nTeacher"
    const rooms = [...body.matchAll(/([^\n]+)\nInstructor\(s\)\n([^\n]+)/g)].map((m) => ({
      name: clean(m[1]),
      teacher: clean(m[2]),
    }));
    for (const room of rooms) {
      const cls = classes.find(
        (c) =>
          lastName(c.teacher.split(" ").slice(-1)[0]) === lastName(room.teacher.split(" ").slice(-1)[0]) &&
          !/homeroom|counsel|library|club|team/i.test(room.name),
      );
      if (!cls) continue;
      try {
        await p.getByText(room.name, { exact: true }).first().click();
        await p.waitForTimeout(6000);
      } catch {
        continue;
      }
      if (isLogin(p.url())) return { status: "needs_login", ...out };
      out.aliases.push({
        externalId: `learn:${room.name}`.slice(0, 200).replace(/[^\w.:@/-]/g, "_"),
        classKey: cls.key,
        source: "ctls-learn",
        label: room.name,
      });
      const text = await p.evaluate(() => document.body.innerText);
      const lines = text.split("\n").map(clean).filter(Boolean);
      const bi = lines.findIndex((l) => /^(Class Board|Coursework)$/.test(l));
      const board = bi >= 0 ? lines.slice(bi + 1) : lines;
      const wi = pickWeek(board);
      if (wi >= 0) {
        const week = board[wi];
        const next = board.findIndex((l, i) => i > wi && WEEK.test(l));
        const block = board.slice(wi + 1, next > 0 ? next : wi + 40);
        const topics = [
          ...new Set(
            block.filter(
              (l) =>
                !NOISE.test(l) &&
                l.length < 40 &&
                !l.toLowerCase().includes(lastName(cls.teacher.split(" ").slice(-1)[0])) &&
                !/open house|instructor/i.test(l) &&
                !/https?:|due |^\W+$|^\d+$/i.test(l),
            ),
          ),
        ].slice(0, 8);
        const title = topics.find((t) => !/quiz|test|corrections|review|practice/i.test(t)) ?? topics[0] ?? week;
        out.units.push({
          externalId: `learn:${cls.key}:${week}`.slice(0, 200).replace(/[^\w.:@/-]/g, "_"),
          classKey: cls.key,
          title,
          topics,
          weekLabel: week.slice(0, 80),
          isCurrent: true,
          source: "ctls-learn",
        });
      }
      // Class Board posts: read from the rendered AngularJS scope (read-only; the API payloads are encrypted).
      const boardPosts = await p
        .evaluate(() => {
          const ng = window.angular;
          if (!ng) return [];
          return [...document.querySelectorAll(".edin-card-rtl")]
            .map((el) => ng.element(el).scope()?.topic)
            .filter((t) => t && t._id && t.type === "board" && !t.isDeleted)
            .map((t) => {
              const div = document.createElement("div");
              div.innerHTML = String(t.content ?? "").replace(/<(br|\/p|\/div|\/li|\/tr)[^>]*>/gi, "\n$&");
              div.querySelectorAll("script,style,iframe").forEach((n) => n.remove());
              const links = [...div.querySelectorAll("a[href]")]
                .map((a) => ({ title: a.textContent.trim().slice(0, 200), url: a.getAttribute("href") }))
                .filter((l) => /^https?:/i.test(l.url ?? ""));
              const files = [...div.querySelectorAll("img[src],video[src],source[src]")]
                .map((m) => ({
                  title: m.getAttribute("alt") || "Attachment",
                  url: (m.getAttribute("src") || "").split("?")[0],
                }))
                .filter((l) => /^https?:/i.test(l.url));
              const text = div.textContent
                .replace(/\u00a0/g, " ")
                .replace(/[ \t]+/g, " ")
                .replace(/\n\s*\n+/g, "\n")
                .trim();
              return {
                id: t._id,
                name: String(t.name ?? "").trim(),
                text,
                links: [...links, ...files],
                author: [t.author?.firstName, t.author?.lastName].filter(Boolean).join(" "),
                added: t.dateAdded,
                start: t.startDate,
                pinned: !!t.pinned,
              };
            });
        })
        .catch(() => []);
      for (const b of boardPosts) {
        const body = b.text.split("\n").map(clean).filter(Boolean).join("\n").slice(0, 3900);
        out.posts.push({
          externalId: `ei:board:${b.id}`.slice(0, 200),
          classKey: cls.key,
          source: "ctls-learn",
          author: b.author || cls.teacher,
          title: (b.name || body.split("\n")[0] || "Class board post").slice(0, 300),
          body,
          url: "https://studentportal.educationincites.com/#/Home",
          postedAt: b.start && new Date(b.start) > new Date(b.added) ? b.start : b.added,
          startsAt: b.start,
          pinned: b.pinned,
          links: b.links.slice(0, 40),
          contentHash: sha(`${b.name}\n${body}\n${b.links.map((l) => l.url).join(" ")}`),
        });
      }
      const links = await p.evaluate(() =>
        [...document.querySelectorAll("a[href^='http']")].map((a) => ({
          t: a.innerText.trim().slice(0, 200),
          u: a.href,
        })),
      );
      for (const l of links) {
        if (/educationincites\.com|mailto:|forms\.(office|cloud)/i.test(l.u)) continue;
        const prov = provider(l.u);
        const kind = /syllabus/i.test(l.t)
          ? "syllabus"
          : /mackinvia|amplify|textbook|ebook/i.test(l.u + l.t)
            ? "ebook"
            : "link";
        if (kind === "syllabus") out.classPatch[cls.key] = { ...out.classPatch[cls.key], syllabusUrl: l.u };
        if (kind === "ebook" && !out.classPatch[cls.key]?.ebookUrl)
          out.classPatch[cls.key] = { ...out.classPatch[cls.key], ebookUrl: l.u };
        if (!l.t || l.t === "-") continue;
        out.resources.push({
          externalId: `learn:${cls.key}:${l.u}`.slice(0, 200).replace(/[^\w.:@/-]/g, "_"),
          classKey: cls.key,
          kind,
          provider: prov,
          title: l.t,
          url: l.u,
          source: "ctls-learn",
        });
      }
      await p.goto(HOME, { waitUntil: "domcontentloaded" });
      await pause();
      await p.waitForTimeout(3000);
    }
    return { status: "ok", ...out };
  } finally {
    await p.close().catch(() => {});
  }
}

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
/** Index of the week header whose start date is the latest one not after today (boards may list newest or oldest first). */
export function pickWeek(lines, now = new Date()) {
  let best = -1,
    bestT = -Infinity,
    first = -1;
  const y = now.getFullYear();
  lines.forEach((l, i) => {
    if (!WEEK.test(l)) return;
    if (first < 0) first = i;
    let d = null;
    const a = /(\d{1,2})\/(\d{1,2})/.exec(l);
    const b = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})/i.exec(l);
    if (a) d = new Date(y, Number(a[1]) - 1, Number(a[2]));
    else if (b) d = new Date(y, MON[b[1].toLowerCase()], Number(b[2]));
    if (d && d - now > 120 * 864e5) d.setFullYear(y - 1);
    if (d && d <= now && now - d < 21 * 864e5 && d.getTime() > bestT) {
      bestT = d.getTime();
      best = i;
    }
  });
  return best >= 0 ? best : lines.some((l) => WEEK.test(l) && /\d/.test(l.replace(/^Week\s+\d+/i, ""))) ? -1 : first;
}
