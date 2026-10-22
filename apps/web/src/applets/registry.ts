import { defineApplet } from "@sparkle/ui";

export const homeworkTimer = defineApplet<{ minutes?: number }>({
  id: "homework-timer",
  title: "Homework timer",
  load: () => import("./HomeworkTimer"),
  minHeight: 120,
});
export const weatherPreview = defineApplet({
  id: "weather",
  title: "Weather",
  load: () => import("./WeatherPreview"),
  minHeight: 120,
});
export const crashDemo = defineApplet({ id: "crash-demo", title: "Crash demo", load: () => import("./CrashDemo") });
