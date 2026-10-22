/** Nav links (plain module so server pages can import them). */
export const I = {
  today: "M3 12l9-8 9 8v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z",
  tasks: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9",
  classes: "M4 19V5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zm0 0a2 2 0 002 2h13",
  gpa: "M12 20V10M18 20V4M6 20v-4",
  scan: "M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM8 12h8M12 8v8",
  family: "M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0",
  import: "M12 3v12m0 0l-4-4m4 4l4-4M4 21h16",
  study: "M12 3l9 5-9 5-9-5zM5 10v5c0 2 3 4 7 4s7-2 7-4v-5",
  spark: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z",
  vault: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4",
  admin: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
};
export const MAIN = [
  { href: "/app/today", label: "Today", icon: I.today },
  { href: "/app/tasks", label: "Tasks", icon: I.tasks },
  { href: "/app/classes", label: "Grades & Classes", icon: I.classes },
  { href: "/app/study", label: "Ask Sparkle", icon: I.spark },
  { href: "/app/attendance", label: "Attendance", icon: I.today },
  { href: "/app/gpa", label: "GPA Simulator", icon: I.gpa },
  { href: "/app/scan", label: "Scan Homework", icon: I.scan },
];
export const MORE = [
  { href: "/app/family", label: "Family & helpers", icon: I.family },
  { href: "/app/import", label: "Import (CSV)", icon: I.import },
  { href: "/app/vault", label: "Vault", icon: I.vault, k: "Soon" },
];
