/** Navigation model for the agent shell (plain module: server + client). [agent label, plain label] */
export type NavItem = { href: string; a: string; p: string; icon: string; group?: string; k?: string };
export const PRIMARY: NavItem[] = [
  { href: "/app/today", a: "Briefing", p: "Today", icon: "M3 12l9-8 9 8v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  {
    href: "/app/tasks",
    a: "Missions",
    p: "Tasks",
    icon: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9",
  },
  {
    href: "/app/classes",
    a: "Case files",
    p: "Classes",
    icon: "M4 19V5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zm0 0a2 2 0 002 2h13",
  },
  { href: "/app/study", a: "Secure line", p: "Ask", icon: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" },
];
export const SECONDARY: NavItem[] = [
  {
    href: "/app/attendance",
    a: "Check-ins",
    p: "Attendance",
    icon: "M8 3v4M16 3v4M4 9h16M5 5h14v15H5z",
    group: "School",
  },
  { href: "/app/gpa", a: "GPA simulator", p: "GPA simulator", icon: "M12 20V10M18 20V4M6 20v-4", group: "School" },
  {
    href: "/app/scan",
    a: "Document scanner",
    p: "Scan homework",
    icon: "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10",
    group: "School",
  },
  {
    href: "/app/import",
    a: "Intel import",
    p: "Import (CSV)",
    icon: "M12 3v12m0 0l-4-4m4 4l4-4M4 21h16",
    group: "School",
  },
  {
    href: "/app/list",
    a: "Supply run",
    p: "Shopping list",
    icon: "M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6M10 21h.01M17 21h.01",
    group: "Home",
  },
  {
    href: "/app/family",
    a: "The team",
    p: "Family & helpers",
    icon: "M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0",
    group: "Home",
  },
  { href: "/app/vault", a: "Vault", p: "Vault", icon: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4", group: "Home", k: "Beta" },
  {
    href: "/app/more",
    a: "Agent settings",
    p: "Settings",
    icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z",
    group: "Account",
  },
];
export const ALL = [...PRIMARY, ...SECONDARY];
export const isActive = (path: string | null, href: string) =>
  !!path && (path === href || path.startsWith(href + "/") || (href === "/app/today" && path === "/app"));
