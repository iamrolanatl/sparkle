import { Hono } from "hono";
import { resilientFetch } from "../lib/resilience";
import { NWS_UA, roundCoord, schoolDay, type Period } from "./nws";

export interface WeatherEnv {
  TODAY_CACHE?: KVNamespace;
}

const TTL = 1800; // 30 min fresh
const STALE_TTL = 6 * 3600; // keep up to 6 h for graceful degradation

export const weather = new Hono<{ Bindings: WeatherEnv }>();

weather.get("/", async (c) => {
  const rc = roundCoord(Number(c.req.query("lat")), Number(c.req.query("lon")));
  if (!rc) return c.json({ error: "bad_request" }, 400);
  const key = `wx:${rc[0]},${rc[1]}`;
  const kv = c.env?.TODAY_CACHE;
  const cached = (await kv?.get(key, "json")) as { at: number; doc: unknown } | null;
  if (cached && Date.now() - cached.at < TTL * 1000) {
    c.header("Cache-Control", "public, max-age=600");
    return c.json({ ...(cached.doc as object), cache: "hit" });
  }
  const f = resilientFetch(fetch, { timeoutMs: 4000, retries: 1 });
  const headers = { "User-Agent": NWS_UA, Accept: "application/geo+json" };
  try {
    const pt = (await (await f(`https://api.weather.gov/points/${rc[0]},${rc[1]}`, { headers })).json()) as {
      properties?: { forecastHourly?: string; relativeLocation?: { properties?: { city?: string; state?: string } } };
    };
    const url = pt.properties?.forecastHourly;
    if (!url) return c.json({ error: "unsupported_location", message: "Weather is available for US locations." }, 404);
    const hr = (await (await f(url, { headers })).json()) as { properties?: { periods?: Period[] } };
    const loc = pt.properties?.relativeLocation?.properties;
    const doc = schoolDay(hr.properties?.periods ?? [], loc?.city ? `${loc.city}, ${loc.state}` : null, new Date());
    await kv?.put(key, JSON.stringify({ at: Date.now(), doc }), { expirationTtl: STALE_TTL });
    c.header("Cache-Control", "public, max-age=600");
    return c.json({ ...doc, cache: "miss" });
  } catch {
    // Graceful degradation (NFR-41): serve stale data if we have it.
    if (cached) return c.json({ ...(cached.doc as object), cache: "stale" });
    return c.json({ error: "weather_unavailable" }, 503);
  }
});
