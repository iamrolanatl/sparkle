import { createHash } from "node:crypto";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Polite pause between page loads (1-3 s). */
export const pause = () => sleep(1000 + Math.random() * 2000);
export const sha = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex");
export const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** "10/21/2026" → "2026-10-21" */
export function mdy(s) {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s ?? "");
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}
/** "Oct 13 at 9:56 AM" (current school year) → ISO, Eastern. */
export function monthDayTime(s, now = new Date()) {
  const m =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})(?:,? (\d{4}))?(?: at (\d{1,2}):(\d{2}) ?([AP]M))?/i.exec(
      s ?? "",
    );
  if (!m) return null;
  const mo = MON[m[1].toLowerCase()];
  let y = m[3] ? Number(m[3]) : now.getFullYear();
  if (!m[3] && mo > now.getMonth() + 2) y -= 1;
  let h = m[4] ? Number(m[4]) % 12 : 12;
  if (m[6] && m[6].toUpperCase() === "PM") h += 12;
  const pad = (x) => String(x).padStart(2, "0");
  return new Date(`${y}-${pad(mo)}-${pad(m[2])}T${pad(h)}:${m[5] ?? "00"}:00-04:00`).toISOString();
}
const LOGIN = /login\.microsoftonline\.com|PXP2?_Login|Login_Student|Login_Parent|\/signin|\/sso\/|accounts\.google/i;
export const isLogin = (url) => LOGIN.test(url);
export const lastName = (n) => clean(n).split(/[ ,]/).filter(Boolean)[0]?.toLowerCase() ?? "";
/** Pick provider from a URL for practice/resource links. */
export function provider(u) {
  const h = (() => {
    try {
      return new URL(u).host;
    } catch {
      return "";
    }
  })();
  const map = [
    ["khanacademy", "khan"],
    ["quizlet", "quizlet"],
    ["blooket", "blooket"],
    ["wayground", "wayground"],
    ["quizizz", "wayground"],
    ["deltamath", "deltamath"],
    ["desmos", "desmos"],
    ["gimkit", "gimkit"],
    ["ixl", "ixl"],
    ["mackinvia", "mackin"],
    ["amplify", "amplify"],
    ["clever", "clever"],
    ["sharepoint", "sharepoint"],
    ["canva", "canva"],
    ["follett", "destiny"],
    ["forms.", "forms"],
    ["youtube", "youtube"],
    ["google", "google"],
  ];
  return map.find(([k]) => h.includes(k))?.[1] ?? h.replace(/^www\./, "");
}
