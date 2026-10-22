/**
 * School-day weather (FR-22, DEC-66): US National Weather Service API — free, no key, public-domain data.
 * Coordinates are rounded to 2 decimals (~1 km) for privacy and cache sharing.
 */
export const NWS_UA = "SparkleStudentApp/0.1 (github.com/iamrolanatl/sparkle)";

export interface Period {
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  probabilityOfPrecipitation?: { value: number | null };
}

export interface SchoolDayWeather {
  place: string | null;
  updatedAt: string;
  morning: Summary | null; // bus stop / walk-in
  afternoon: Summary | null; // pickup / practice
  tip: string;
}
interface Summary {
  label: string;
  tempF: number;
  forecast: string;
  rainChance: number | null; // null = NWS gave no value (show "unknown", not 0%)
}

/** Rough US bounding boxes (CONUS, Alaska, Hawaii, Puerto Rico/USVI, Guam). NWS covers only these. */
const US_BOXES: [number, number, number, number][] = [
  [24.4, 49.5, -125.0, -66.9],
  [51.0, 71.6, -179.9, -129.9],
  [18.8, 22.4, -160.4, -154.7],
  [17.6, 18.6, -67.4, -64.5],
  [13.2, 13.7, 144.6, 145.0],
];
export const inUS = (lat: number, lon: number) =>
  US_BOXES.some(([a, b, c, d]) => lat >= a && lat <= b && lon >= c && lon <= d);

/** Only follow NWS-provided URLs that point back at api.weather.gov (SSRF defense in depth). */
export function safeNwsUrl(u: string | undefined): string | null {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === "https:" && x.hostname === "api.weather.gov" ? x.toString() : null;
  } catch {
    return null;
  }
}

export function roundCoord(lat: number, lon: number): [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return [Math.round(lat * 100) / 100, Math.round(lon * 100) / 100];
}

const toF = (p: Period) => (p.temperatureUnit === "C" ? Math.round((p.temperature * 9) / 5 + 32) : p.temperature);

function summarize(p: Period | undefined, label: string): Summary | null {
  if (!p) return null;
  return { label, tempF: toF(p), forecast: p.shortForecast, rainChance: p.probabilityOfPrecipitation?.value ?? null };
}

/** Pick 7 AM and 3 PM local hours from hourly periods (startTime carries the local offset). */
export function schoolDay(hourly: Period[], place: string | null, now: Date): SchoolDayWeather {
  const hourOf = (p: Period) => Number(p.startTime.slice(11, 13));
  const upcoming = hourly.filter((p) => Date.parse(p.startTime) >= now.getTime() - 3_600_000).slice(0, 36);
  const morning = summarize(
    upcoming.find((p) => hourOf(p) === 7),
    "Morning (7 AM)",
  );
  const afternoon = summarize(
    upcoming.find((p) => hourOf(p) === 15),
    "Afternoon (3 PM)",
  );
  const rain = Math.max(morning?.rainChance ?? 0, afternoon?.rainChance ?? 0);
  const cold = Math.min(morning?.tempF ?? 99, afternoon?.tempF ?? 99);
  const tip =
    rain >= 50
      ? "Pack an umbrella or rain jacket."
      : cold <= 45
        ? "It's chilly — grab a warm layer."
        : (afternoon?.tempF ?? 0) >= 90
          ? "Hot afternoon — bring water."
          : "Looks like a normal school day.";
  return { place, updatedAt: now.toISOString(), morning, afternoon, tip };
}
