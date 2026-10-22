import { Hono } from "hono";
import { getUser, type AuthEnv } from "../auth/user";
import { allow, type RateLimitBinding } from "../chat/ratelimit";
import { resilientFetch } from "../lib/resilience";
import { inUS, NWS_UA, roundCoord, safeNwsUrl, schoolDay, type Period, type SchoolDayWeather } from "./nws";

export interface WeatherEnv extends AuthEnv {
  WEATHER_CACHE?: KVNamespace; // own namespace, never TODAY_CACHE (Team E review of #19)
  WEATHER_RATE_LIMITER?: RateLimitBinding;
}

const TTL = 1800; // 30 min fresh
const STALE_TTL = 6 * 3600; // keep up to 6 h for graceful degradation

// In-isolate single-flight: concurrent misses for the same cell share one NWS fetch (stampede guard).
// KV write guard: cap cache writes per isolate per hour so weather can never starve the account-wide KV write quota
// that Today caching depends on. Over the cap we still answer, just without caching.
const WRITE_CAP_PER_HOUR = 60;
let writeWindow = { start: 0, n: 0 };
export function allowCacheWrite(now = Date.now()): boolean {
  if (now - writeWindow.start >= 3_600_000) writeWindow = { start: now, n: 0 };
  if (writeWindow.n >= WRITE_CAP_PER_HOUR) return false;
  writeWindow.n++;
  return true;
}

const inflight = new Map<string, Promise<SchoolDayWeather | "unsupported">>();

export const weather = new Hono<{ Bindings: WeatherEnv }>();

/**
 * School-day weather (FR-22). Signed-in users only; coordinates must be the school ZIP centroid computed by the
 * client from the family's saved ZIP (DEC-75) — never device geolocation. US only (NWS coverage).
 */
weather.get("/", async (c) => {
  const env = c.env ?? {};
  const user = await getUser(env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!(await allow(`wx:${user.id}`, env.WEATHER_RATE_LIMITER, 30, 60_000)))
    return c.json({ error: "rate_limited" }, 429);
  const rc = roundCoord(Number(c.req.query("lat")), Number(c.req.query("lon")));
  if (!rc) return c.json({ error: "bad_request" }, 400);
  if (!inUS(rc[0], rc[1]))
    return c.json({ error: "unsupported_location", message: "Weather is available for US locations." }, 404);
  const key = `wx:${rc[0]},${rc[1]}`;
  const kv = env.WEATHER_CACHE;
  const cached = (await kv?.get(key, "json")) as { at: number; doc: SchoolDayWeather } | null;
  c.header("Cache-Control", "private, max-age=600");
  if (cached && Date.now() - cached.at < TTL * 1000) return c.json({ ...cached.doc, cache: "hit" });
  try {
    let p = inflight.get(key);
    if (!p) {
      p = fetchSchoolDay(rc).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    const doc = await p;
    if (doc === "unsupported")
      return c.json({ error: "unsupported_location", message: "Weather is available for US locations." }, 404);
    if (kv && allowCacheWrite())
      await kv.put(key, JSON.stringify({ at: Date.now(), doc }), { expirationTtl: STALE_TTL }).catch(() => {});
    return c.json({ ...doc, cache: "miss" });
  } catch {
    // Graceful degradation (NFR-41): serve stale data if we have it.
    if (cached) return c.json({ ...cached.doc, cache: "stale" });
    return c.json({ error: "weather_unavailable" }, 503);
  }
});

async function fetchSchoolDay(rc: [number, number]): Promise<SchoolDayWeather | "unsupported"> {
  const f = resilientFetch(fetch, { timeoutMs: 4000, retries: 1 });
  const headers = { "User-Agent": NWS_UA, Accept: "application/geo+json" };
  const pt = (await (await f(`https://api.weather.gov/points/${rc[0]},${rc[1]}`, { headers })).json()) as {
    properties?: { forecastHourly?: string; relativeLocation?: { properties?: { city?: string; state?: string } } };
  };
  const url = safeNwsUrl(pt.properties?.forecastHourly);
  if (!url) return "unsupported";
  const hr = (await (await f(url, { headers })).json()) as { properties?: { periods?: Period[] } };
  const loc = pt.properties?.relativeLocation?.properties;
  return schoolDay(hr.properties?.periods ?? [], loc?.city ? `${loc.city}, ${loc.state}` : null, new Date());
}
