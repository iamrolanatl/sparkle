/** Static, real links for Cobb County families and unit-matched practice searches (no fake data). */
export const COBB_LINKS = [
  { name: "CTLS Learn", desc: "Lessons & posts", href: "https://ctlslearn.cobbk12.org", color: "#0ea5e9" },
  { name: "CTLS Parent", desc: "Teacher messages", href: "https://ctlsparent.cobbk12.org", color: "#b45309" },
  { name: "StudentVUE", desc: "Grades & attendance", href: "https://studentvue.cobbk12.org", color: "#22c55e" },
  { name: "Clever", desc: "Cobb digital library", href: "https://clever.com/in/cobb", color: "#3b82f6" },
  { name: "Office 365", desc: "Outlook · OneDrive", href: "https://portal.office.com", color: "#f97316" },
] as const;

type Provider = { name: string; color: string; url: (q: string) => string };
const P: Record<string, Provider> = {
  khan: {
    name: "Khan Academy",
    color: "#14bf96",
    url: (q) => `https://www.khanacademy.org/search?page_search_query=${q}`,
  },
  ixl: { name: "IXL", color: "#22c55e", url: (q) => `https://www.ixl.com/search?q=${q}` },
  quizlet: { name: "Quizlet", color: "#4255ff", url: (q) => `https://quizlet.com/search?query=${q}&type=sets` },
  blooket: { name: "Blooket", color: "#0bc2cf", url: (q) => `https://dashboard.blooket.com/discover/search?q=${q}` },
  gizmos: {
    name: "Gizmos",
    color: "#f59e0b",
    url: (q) => `https://gizmos.explorelearning.com/find-gizmos/search?q=${q}`,
  },
  brainpop: { name: "BrainPOP", color: "#f97316", url: (q) => `https://www.brainpop.com/search/?keyword=${q}` },
  newsela: { name: "Newsela", color: "#3b82f6", url: (q) => `https://newsela.com/search?query=${q}` },
  noredink: { name: "NoRedInk", color: "#ef4444", url: () => `https://www.noredink.com/` },
};

export type Subject = "math" | "ela" | "sci" | "ss" | "other";
export function subjectOf(className: string): Subject {
  const n = className.toLowerCase();
  if (/math|algebra|geometry|calculus|statistic/.test(n)) return "math";
  if (/language arts|\bela\b|english|reading|literature|writing/.test(n)) return "ela";
  if (/science|biology|chemistry|physics|earth|life sci/.test(n)) return "sci";
  if (/social studies|history|geography|civics|government|economics/.test(n)) return "ss";
  return "other";
}
const BY_SUBJECT: Record<Subject, string[]> = {
  math: ["khan", "ixl", "quizlet", "blooket"],
  ela: ["newsela", "khan", "quizlet", "noredink"],
  sci: ["gizmos", "brainpop", "khan", "quizlet"],
  ss: ["brainpop", "newsela", "blooket", "quizlet"],
  other: ["khan", "brainpop"],
};

/** One link per provider, searching that site for the current unit's topics. */
export function practiceLinks(className: string, topics: string[], unitTitle: string | null) {
  const terms = topics.length ? topics : unitTitle ? [unitTitle.replace(/^unit\s*\d+\s*[·:-]\s*/i, "")] : [];
  if (!terms.length) return [];
  return BY_SUBJECT[subjectOf(className)].map((k, i) => {
    const p = P[k]!;
    const term = terms[i % terms.length]!;
    return {
      name: p.name,
      color: p.color,
      desc: k === "noredink" ? "Grammar & writing practice" : term,
      href: p.url(encodeURIComponent(term)),
    };
  });
}

/** Warm, elegant class palette (render-time only; never stored). No blue/purple. */
export const CLASS_COLORS = ["#c9a24a", "#c97b5a", "#8fa67a", "#d48a8a", "#b8936a", "#a3906f", "#d9a86c", "#9c7b6b"];
