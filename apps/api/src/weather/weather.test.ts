import { describe, expect, it } from "vitest";
import { roundCoord, schoolDay, type Period } from "./nws";

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
});
