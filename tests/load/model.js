// Capacity model for 1,000,000 users (NFR-35, DEC-187). Pure math, shared by mix.js and the unit test.
// Change assumptions here; the README table is generated from the same numbers.
export const ASSUMPTIONS = {
  registeredUsers: 1_000_000,
  dauRatio: 0.35, // school-day DAU / registered (student + guardian apps)
  peakHourShare: 0.2, // share of DAU active in the busiest hour (7-8 AM ET school morning)
  sessionMinutes: 10,
  requestsPerSessionMinute: 12, // page + API calls incl. Today, tasks, chat
  headroom: 2.5, // design factor over modelled peak
  // Request mix at peak (sums to 1).
  mix: { today: 0.55, health: 0.05, tasks_list: 0.2, tasks_write: 0.05, chat: 0.1, other: 0.05 },
  todayCacheHit: 0.95, // KV Today document (DEC-61)
};

export function capacity(a = ASSUMPTIONS) {
  const dau = a.registeredUsers * a.dauRatio;
  const peakHourUsers = dau * a.peakHourShare;
  const concurrent = (peakHourUsers * a.sessionMinutes) / 60;
  const rps = (concurrent * a.requestsPerSessionMinute) / 60;
  const designConcurrent = Math.round(concurrent * a.headroom);
  const designRps = Math.round(rps * a.headroom);
  // DB-touching RPS: Today misses + task reads/writes + chat persistence.
  const dbRps = Math.round(
    designRps * (a.mix.today * (1 - a.todayCacheHit) + a.mix.tasks_list + a.mix.tasks_write + a.mix.chat),
  );
  return {
    dau,
    peakHourUsers,
    concurrent: Math.round(concurrent),
    rps: Math.round(rps),
    designConcurrent,
    designRps,
    dbRps,
  };
}
