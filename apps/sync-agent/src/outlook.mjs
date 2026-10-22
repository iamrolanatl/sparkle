import { clean, isLogin, sha } from "./util.mjs";

/** Outlook (Eli's school mailbox): inbox LIST only (never opens a message, so nothing is marked read). */
export async function pullOutlook(ctx, classes, teachers) {
  const p = await ctx.newPage();
  const out = { messages: [] };
  try {
    await p.goto("https://outlook.office.com/mail/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(12000);
    if (isLogin(p.url())) return { status: "needs_login", ...out };
    const rows = await p.evaluate(() =>
      [...document.querySelectorAll("[role=option]")].slice(0, 60).map((r) => ({
        lines: r.innerText
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        id: r.getAttribute("data-convid") || r.id || "",
      })),
    );
    const names = teachers.map((t) => t.name.toLowerCase());
    for (const r of rows) {
      const [sender, subject, ...rest] = r.lines.filter(
        (l) => !/^(Unread|Collapsed|Expand conversation|[A-Z]{1,3})$/.test(l),
      );
      if (!sender || !subject) continue;
      const when =
        rest.find((l) => /^(\d{1,2}\/\d{1,2}\/\d{4}|Mon|Tue|Wed|Thu|Fri|Sat|Sun|\d{1,2}:\d\d)/.test(l)) ?? null;
      const snippet = clean(rest.filter((l) => l !== when).join(" ")).slice(0, 300) || null;
      const sec = /^(\d{3,4}) - /.exec(subject)?.[1];
      const cls =
        (sec && classes.find((c) => c.sectionNo === String(Number(sec)))) ||
        classes.find((c) => lastName(c.teacher) && sender.toLowerCase().includes(lastName(c.teacher)));
      const isTeacher = !!sec || names.some((n) => sender.toLowerCase() === n) || / - .+ - /.test(subject);
      out.messages.push({
        externalId: `ol:${(r.id || sha([sender, subject, when])).slice(0, 120)}`.replace(/[^\w.:@/-]/g, "_"),
        classKey: cls?.key ?? null,
        source: "outlook",
        sender: sender.slice(0, 120),
        isTeacher,
        subject: subject.slice(0, 300),
        snippet,
        receivedAt: parseWhen(when),
      });
    }
    return { status: "ok", ...out };
  } finally {
    await p.close().catch(() => {});
  }
}
const lastName = (n) => clean(n).split(" ").slice(-1)[0]?.toLowerCase() ?? "";
function parseWhen(w) {
  if (!w) return null;
  const now = new Date();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(w);
  if (m) return new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T12:00:00-04:00`).toISOString();
  m = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w* (\d{1,2})\/(\d{1,2})/.exec(w);
  if (m) {
    let y = now.getFullYear();
    if (Number(m[1]) > now.getMonth() + 1) y -= 1;
    return new Date(`${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T12:00:00-04:00`).toISOString();
  }
  if (/^\d{1,2}:\d\d/.test(w)) return now.toISOString();
  return null;
}
