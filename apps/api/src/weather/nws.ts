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
  rainChance: number;
}

export function roundCoord(lat: number, lon: number): [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return [Math.round(lat * 100) / 100, Math.round(lon * 100) / 100];
}

const toF = (p: Period) => (p.temperatureUnit === "C" ? Math.round((p.temperature * 9) / 5 + 32) : p.temperature);

function summarize(p: Period | undefined, label: string): Summary | null {
  if (!p) return null;
  return { label, tempF: toF(p), forecast: p.shortForecast, rainChance: p.probabilityOfPrecipitation?.value ?? 0 };
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
