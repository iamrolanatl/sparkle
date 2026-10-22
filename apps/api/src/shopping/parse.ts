/** "2 composition notebooks for ELA" -> {title, quantity, category, classLabel}. Pure, no AI. */
const SCHOOL =
  /\b(notebook|pencil|pen|marker|crayon|glue|folder|binder|paper|calculator|eraser|highlighter|ruler|scissors|index card|poster|backpack|earbud|headphone|protractor|compass|sharpener|sticky|tape|book cover|lab|composition)\w*/i;
const WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  dozen: 12,
};

export interface ParsedItem {
  title: string;
  quantity: number;
  category: "school" | "household";
  classLabel: string | null;
}

// Typed shorthand -> words likely in the real class name (e.g. "Soc Stdy 7Q2", "Phys Ed 7Q2").
const ALIAS: [RegExp, RegExp][] = [
  [/^(ela|la|english|language arts)$/i, /\b(ela|language arts|english|lang arts)\b/i],
  [/^(ss|social studies|soc stud(y|ies)|history)$/i, /\b(soc(ial)?\.? ?st(u)?dy|social studies|ss|history)\b/i],
  [/^(sci|science)$/i, /\b(sci(ence)?)\b/i],
  [/^(math|maths)$/i, /\bmath/i],
  [/^(pe|p\.e\.|gym|phys ed)$/i, /\b(pe|phys(ical)? ?ed(ucation)?|gym)\b/i],
  [/^(reading)$/i, /\breading\b/i],
  [/^(chorus|choir)$/i, /\b(chorus|choir)\b/i],
];
export function matchClass(want: string, classes: string[]): string | undefined {
  const w = want.trim();
  const a = ALIAS.find(([k]) => k.test(w));
  if (a) return classes.find((c) => a[1].test(c));
  const lw = w.toLowerCase();
  return classes.find((c) => c.toLowerCase().includes(lw) || lw.includes(c.toLowerCase().split(" ")[0]!));
}

export function parseItem(raw: string, classes: string[] = []): ParsedItem {
  let s = raw.replace(/\s+/g, " ").trim().slice(0, 160);
  let quantity = 1;
  const n =
    /^(\d{1,5})\s*(x\s+)?/i.exec(s) ?? /^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)\s+/i.exec(s);
  if (n) {
    quantity = /^\d/.test(n[1]!) ? Number(n[1]) : WORDS[n[1]!.toLowerCase()]!;
    s = s.slice(n[0].length);
  } else {
    const x = /\s*[x×]\s*(\d{1,3})$/i.exec(s);
    if (x) {
      quantity = Number(x[1]);
      s = s.slice(0, x.index);
    }
  }
  let classLabel: string | null = null;
  const f = /\s+for\s+(.{2,40})$/i.exec(s);
  if (f) {
    const want = f[1]!.toLowerCase();
    const hit = matchClass(f[1]!, classes);
    if (hit || /^(ela|la|ss|sci|math|science|social studies|pe|art|music|band|spanish|pltw|reading|chorus)\b/i.test(want)) {
      classLabel = (hit ?? f[1]!).slice(0, 60);
      s = s.slice(0, f.index);
    }
  }
  const title = (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 120) || raw.slice(0, 120);
  const category = classLabel || SCHOOL.test(title) ? "school" : "household";
  return { title, quantity: Math.min(Math.max(quantity, 1), 999), category, classLabel };
}
