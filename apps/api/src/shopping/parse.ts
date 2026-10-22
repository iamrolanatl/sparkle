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
    const hit = classes.find((c) => c.toLowerCase().includes(want) || want.includes(c.toLowerCase().split(" ")[0]!));
    if (hit || /^(ela|math|science|social studies|pe|art|music|band|spanish|pltw|reading)\b/i.test(want)) {
      classLabel = (hit ?? f[1]!).slice(0, 60);
      s = s.slice(0, f.index);
    }
  }
  const title = (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 120) || raw.slice(0, 120);
  const category = classLabel || SCHOOL.test(title) ? "school" : "household";
  return { title, quantity: Math.min(Math.max(quantity, 1), 999), category, classLabel };
}
