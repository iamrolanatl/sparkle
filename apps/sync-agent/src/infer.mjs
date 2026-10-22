const STOP = new Set(
  "the and for with your from week quiz test homework practice classwork warm warmup participation dress out check notes review assignment day part study guide late work rehearsal expectations formative summative".split(
    " ",
  ),
);
/**
 * Current unit for a class with no CTLS Learn weekly topics, inferred from recent assignment names
 * (Synergy "unit" field first, then "Unit N …" in titles, then a topic word repeated across titles). Labelled inferred.
 */
export function inferUnit(cls, assignments, now = new Date()) {
  const lo = now.getTime() - 28 * 864e5,
    hi = now.getTime() + 14 * 864e5;
  const recent = assignments.filter(
    (a) => a.classKey === cls.key && a.dueAt && Date.parse(a.dueAt) >= lo && Date.parse(a.dueAt) <= hi,
  );
  if (!recent.length) return null;
  const count = (xs) => {
    const m = new Map();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  let title = count(recent.map((a) => a.unit).filter(Boolean))[0]?.[0] ?? null;
  if (!title) {
    const u = count(
      recent
        .map((a) => /\bunit\s*\d+[a-z]?(?:\s*[:\-–]?\s*[A-Za-z][\w &]{2,30})?/i.exec(a.title)?.[0]?.trim())
        .filter(Boolean),
    );
    title = u[0]?.[0] ?? null;
  }
  if (!title) {
    const w = count(
      recent.flatMap((a) => [
        ...new Set((a.title.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((x) => !STOP.has(x))),
      ]),
    ).filter(([, n]) => n >= 2);
    if (w[0]) title = w[0][0][0].toUpperCase() + w[0][0].slice(1);
  }
  if (!title) return null;
  const topics = [
    ...new Set(recent.sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt)).map((a) => a.title)),
  ].slice(0, 5);
  return {
    externalId: `inferred:${cls.key}`.slice(0, 200).replace(/[^\w.:@/-]/g, "_"),
    classKey: cls.key,
    title: title.slice(0, 120),
    topics,
    weekLabel: "Inferred from assignments",
    isCurrent: true,
    source: "inferred",
  };
}
