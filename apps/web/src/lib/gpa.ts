/**
 * Deterministic GPA engine (FR-06). AI may explain results but never calculates them.
 * All arithmetic is done in integer thousandths to avoid floating-point drift.
 * Default scale follows common Georgia/Cobb practice (A 90+, B 80–89, C 70–79, F < 70); weights and
 * cut-offs are configuration so districts can be added without code changes (DEC-64).
 */
export type Level = "standard" | "honors" | "ap" | "ib" | "dual";

export interface Scale {
  /** Ordered high→low: minimum numeric grade (0–100) and quality points (×1000). */
  bands: { min: number; letter: string; points: number }[];
  /** Weighted bonus per level (×1000). */
  bonus: Record<Level, number>;
  /** Bonus is not applied to failing grades. */
  noBonusBelowPoints: number;
}

const GA_DEFAULT_SCALE: Scale = {
  bands: [
    { min: 90, letter: "A", points: 4000 },
    { min: 80, letter: "B", points: 3000 },
    { min: 70, letter: "C", points: 2000 },
    { min: 0, letter: "F", points: 0 },
  ],
  bonus: { standard: 0, honors: 500, ap: 1000, ib: 1000, dual: 1000 },
  noBonusBelowPoints: 1000,
};

export interface Course {
  name: string;
  /** Final numeric grade 0–100 (rounded half-up to an integer, as report cards do). */
  grade: number;
  /** Credit hours (e.g. 0.5 per semester, 1.0 per year). */
  credits: number;
  level?: Level;
}

export interface GpaResult {
  unweighted: number;
  weighted: number;
  credits: number;
  courses: { name: string; letter: string; points: number; weightedPoints: number; credits: number }[];
}

const toMilli = (x: number) => Math.round(x * 1000);

export function letterFor(grade: number, scale: Scale = GA_DEFAULT_SCALE) {
  const g = Math.round(grade);
  if (!Number.isFinite(g) || g < 0 || g > 110) throw new RangeError(`grade out of range: ${grade}`);
  return scale.bands.find((b) => g >= b.min)!;
}

export function computeGpa(courses: Course[], scale: Scale = GA_DEFAULT_SCALE): GpaResult {
  let credM = 0;
  let unw = 0;
  let w = 0;
  const rows = courses.map((c) => {
    if (!(c.credits > 0)) throw new RangeError(`credits must be > 0 for ${c.name}`);
    const band = letterFor(c.grade, scale);
    const bonus = band.points >= scale.noBonusBelowPoints ? scale.bonus[c.level ?? "standard"] : 0;
    const cm = toMilli(c.credits);
    credM += cm;
    unw += band.points * cm;
    w += (band.points + bonus) * cm;
    return {
      name: c.name,
      letter: band.letter,
      points: band.points / 1000,
      weightedPoints: (band.points + bonus) / 1000,
      credits: c.credits,
    };
  });
  const div = (x: number) => (credM === 0 ? 0 : Math.round(x / credM) / 1000);
  return { unweighted: div(unw), weighted: div(w), credits: credM / 1000, courses: rows };
}

/** Simulator: what GPA results if `hypothetical` courses are added (or replace same-named ones). */
export function simulate(current: Course[], hypothetical: Course[], scale: Scale = GA_DEFAULT_SCALE) {
  const names = new Set(hypothetical.map((c) => c.name));
  const before = computeGpa(current, scale);
  const after = computeGpa([...current.filter((c) => !names.has(c.name)), ...hypothetical], scale);
  return {
    before,
    after,
    deltaUnweighted: Math.round((after.unweighted - before.unweighted) * 1000) / 1000,
    deltaWeighted: Math.round((after.weighted - before.weighted) * 1000) / 1000,
  };
}

/** Lowest integer grade needed in `course` for the overall unweighted GPA to reach `target`, or null. */
export function gradeNeeded(
  current: Course[],
  course: Omit<Course, "grade">,
  target: number,
  scale: Scale = GA_DEFAULT_SCALE,
) {
  for (let g = 0; g <= 100; g++) {
    if (computeGpa([...current, { ...course, grade: g }], scale).unweighted >= target) return g;
  }
  return null;
}
