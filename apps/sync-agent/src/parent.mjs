import { clean, isLogin, monthDayTime, pause } from "./util.mjs";

const BASE = "https://ctlsparent.cobbk12.org";

/** CTLS Parent (ParentSquare) adapter: section feeds + school feed posts, class/school calendar JSON. Read-only (no opens of chats). */
export async function pullParent(ctx, classes, { schoolId = "4193" } = {}) {
  const p = await ctx.newPage();
  const out = { posts: [], events: [], aliases: [], messages: [] };
  try {
    await p.goto(`${BASE}/schools/${schoolId}/feeds`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await p.waitForTimeout(3000);
    if (isLogin(p.url())) return { status: "needs_login", ...out };
    const sections = await p.evaluate(() =>
      [...document.querySelectorAll("a[href^='/sections/']")].map((a) => ({
        t: a.innerText.trim(),
        h: a.getAttribute("href"),
      })),
    );
    const feeds = [{ h: `/schools/${schoolId}/feeds`, key: null }];
    for (const s of sections) {
      const sn = /SN (\d+)/.exec(s.t)?.[1];
      const cls = sn && classes.find((c) => c.sectionNo === String(Number(sn)));
      if (!cls) continue;
      out.aliases.push({ externalId: `ps:${s.h}`, classKey: cls.key, source: "ctls-parent", label: s.t.slice(0, 200) });
      feeds.push({ h: s.h, key: cls.key });
    }
    for (const f of feeds) {
      if (f.h !== feeds[0].h) {
        await pause();
        await p.goto(BASE + f.h, { waitUntil: "domcontentloaded", timeout: 45000 });
        await p.waitForTimeout(2500);
      }
      const posts = await p.evaluate(() => {
        const seen = new Set();
        const res = [];
        for (const a of document.querySelectorAll("a[href^='/feeds/']")) {
          const m = /^\/feeds\/(\d+)$/.exec(a.getAttribute("href") ?? "");
          if (!m || seen.has(m[1]) || !a.innerText.trim() || /^Read More/i.test(a.innerText.trim())) continue;
          seen.add(m[1]);
          let el = a;
          for (let i = 0; i < 6 && el.parentElement && el.innerText.length < 300; i++) el = el.parentElement;
          res.push({ id: m[1], title: a.innerText.trim(), text: el.innerText.slice(0, 2500) });
        }
        return res;
      });
      for (const x of posts) {
        const meta = x.text.split("\n").find((l) => / ago •|\bat \d{1,2}:\d\d/.test(l)) ?? "";
        const author =
          meta
            .split("•")
            .map(clean)
            .find((x) => x && !/^\d+ files?$/i.test(x)) ?? null;
        const sn = [...x.text.matchAll(/SN (\d+)/g)].map((m) => String(Number(m[1])));
        const cls = f.key ?? classes.find((c) => sn.includes(c.sectionNo))?.key ?? null;
        const body = clean(
          x.text
            .split(meta)
            .slice(1)
            .join(" ")
            .replace(/Read More.*$/s, ""),
        ).slice(0, 1500);
        const existing = out.posts.find((q) => q.externalId === `ps:${x.id}`);
        if (existing) {
          if (!existing.classKey && cls) existing.classKey = cls;
          continue;
        }
        out.posts.push({
          externalId: `ps:${x.id}`,
          classKey: cls,
          source: "ctls-parent",
          author,
          title: x.title.slice(0, 300),
          body,
          url: `${BASE}/feeds/${x.id}`,
          postedAt: monthDayTime(meta),
        });
      }
    }
    // calendar JSON (same calls the calendar page makes)
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10);
    const end = new Date(now.getTime() + 60 * 864e5).toISOString().slice(0, 10);
    for (const kind of ["school", "class", "district"]) {
      const list = await p.evaluate(async (u) => {
        try {
          const r = await fetch(u, { headers: { accept: "application/json" } });
          return r.ok ? await r.json() : [];
        } catch {
          return [];
        }
      }, `${BASE}/schools/${schoolId}/${kind}-events?start=${start}T00:00:00-04:00&end=${end}T00:00:00-05:00&timeZone=America%2FNew_York`);
      for (const e of Array.isArray(list) ? list : []) {
        const title = clean(e.title ?? e.name ?? "");
        const s = e.start ?? e.start_at ?? e.starts_at;
        if (!title || !s) continue;
        out.events.push({
          externalId: `ps:${kind}:${e.id ?? title + s}`.slice(0, 200).replace(/[^\w.:@/-]/g, "_"),
          source: "ctls-parent",
          kind,
          title,
          startsAt: s,
          endsAt: e.end ?? e.end_at ?? null,
        });
      }
    }
    // 1:1 teacher messages: fetch the chat LIST html (no thread is opened, so nothing is marked read).
    try {
      const chatsHref = await p.evaluate(
        () => document.querySelector("a[href$='/chats'], a[href*='/chats?']")?.getAttribute("href") ?? null,
      );
      if (chatsHref) {
        await pause();
        const threads = await p.evaluate(async (href) => {
          const res = await fetch(href.split("?")[0], { credentials: "include" });
          if (!res.ok) return [];
          const d = new DOMParser().parseFromString(await res.text(), "text/html");
          return [...d.querySelectorAll("a.a-chat-thread")].map((a) => ({
            id: /chats\/(\d+)/.exec(a.getAttribute("href") ?? "")?.[1] ?? "",
            t: a.textContent.replace(/\s+/g, " ").trim(),
            unread: /unread/i.test(a.className),
          }));
        }, chatsHref);
        for (const th of threads) {
          const m = parseChat(th.t);
          if (!th.id || !m) continue;
          const ln = m.sender.split(" ").slice(-1)[0].toLowerCase();
          const cls = classes.find(
            (c) =>
              String(c.teacher ?? "")
                .toLowerCase()
                .split(" ")
                .slice(-1)[0] === ln,
          );
          out.messages.push({
            externalId: `ps:chat:${th.id}`,
            classKey: cls?.key ?? null,
            source: "ctls-parent",
            sender: m.sender.slice(0, 120),
            isTeacher: true,
            subject: `Message from ${m.sender}`.slice(0, 300),
            snippet: m.snippet.slice(0, 300) || null,
            receivedAt: m.at,
          });
        }
      }
    } catch {
      /* chats are best-effort */
    }
    return { status: "ok", ...out };
  } finally {
    await p.close().catch(() => {});
  }
}

/** "Kimberly Tuttle 2 Messages Thu 12/18/25, 10:23 am I wanted to…" → sender, ISO time, snippet. */
export function parseChat(t) {
  const m =
    /^(.+?) (\d+) Messages? (?:\w{3} )?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),? (\d{1,2}):(\d\d) ?([ap]m) ?(.*)$/i.exec(t);
  if (!m) return null;
  const y = m[5].length === 2 ? 2000 + Number(m[5]) : Number(m[5]);
  let h = Number(m[6]) % 12;
  if (/pm/i.test(m[8])) h += 12;
  const iso = `${y}-${m[3].padStart(2, "0")}-${m[4].padStart(2, "0")}T${String(h).padStart(2, "0")}:${m[7]}:00-05:00`;
  return { sender: m[1].trim(), at: new Date(iso).toISOString(), snippet: m[9].trim() };
}
