import { describe, expect, it } from "vitest";
import { inUS, roundCoord, safeNwsUrl, schoolDay, type Period } from "./nws";
import { weather } from "./route";

const p = (startTime: string, temperature: number, shortForecast: string, rain = 0): Period => ({
  name: "",
  startTime,
  isDaytime: true,
  temperature,
  temperatureUnit: "F",
  shortForecast,
  probabilityOfPrecipitation: { value: rain },
});

describe("weather (FR-22)", () => {
  it("rounds coordinates for privacy and rejects junk", () => {
    expect(roundCoord(33.95123, -84.54987)).toEqual([33.95, -84.55]);
    expect(roundCoord(NaN, 1)).toBeNull();
    expect(roundCoord(95, 1)).toBeNull();
  });
  it("picks 7 AM and 3 PM and gives a tip", () => {
    const now = new Date("2026-10-22T10:00:00Z"); // 6 AM ET
    const d = schoolDay(
      [
        p("2026-10-22T06:00:00-04:00", 50, "Clear"),
        p("2026-10-22T07:00:00-04:00", 52, "Sunny"),
        p("2026-10-22T15:00:00-04:00", 70, "Showers", 60),
      ],
      "Marietta, GA",
      now,
    );
    expect(d.morning).toEqual({ label: "Morning (7 AM)", tempF: 52, forecast: "Sunny", rainChance: 0 });
    expect(d.afternoon?.rainChance).toBe(60);
    expect(d.tip).toBe("Pack an umbrella or rain jacket.");
  });
  it("treats a missing rain value as unknown, not 0%", () => {
    const now = new Date("2026-10-22T10:00:00Z");
    const q = p("2026-10-22T07:00:00-04:00", 52, "Cloudy");
    q.probabilityOfPrecipitation = { value: null };
    expect(schoolDay([q], null, now).morning?.rainChance).toBeNull();
  });
  it("only follows api.weather.gov URLs (SSRF guard)", () => {
    expect(safeNwsUrl("https://api.weather.gov/gridpoints/FFC/50,86/forecast/hourly")).toContain("api.weather.gov");
    expect(safeNwsUrl("https://evil.example/x")).toBeNull();
    expect(safeNwsUrl("http://api.weather.gov/x")).toBeNull();
    expect(safeNwsUrl(undefined)).toBeNull();
  });
  it("US-only coverage", () => {
    expect(inUS(33.95, -84.55)).toBe(true);
    expect(inUS(61.2, -149.9)).toBe(true);
    expect(inUS(51.5, -0.12)).toBe(false);
  });
  it("requires a signed-in user", async () => {
    const res = await weather.request("/?lat=33.95&lon=-84.55", {}, {});
    expect(res.status).toBe(401);
  });
});
