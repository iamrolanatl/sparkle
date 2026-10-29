/** Sparkle design tokens: glass + cyan/teal neon, high-contrast light/dark. */
export const tokens = {
  color: {
    neon: { cyan: "#5dffa5", teal: "#5dffa5", glow: "rgba(93, 255, 165, 0.18)" },
    dark: {
      bg: "#07090a",
      surface: "rgba(255, 255, 255, 0.025)",
      border: "rgba(255, 255, 255, 0.07)",
      text: "#e6efe9",
      textMuted: "#9fb0a7",
    },
    light: {
      bg: "#eef1ef",
      surface: "rgba(255, 255, 255, 0.70)",
      border: "rgba(15, 122, 67, 0.45)",
      text: "#0d1512",
      textMuted: "#45534d",
    },
  },
  radius: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
  blur: { glass: "16px" },
  motion: { fast: 0.15, base: 0.3, slow: 0.6 },
} as const;

/** Performance budget (NFR-02): effects target 60 fps (NFR-48), auto-disable under 30 fps. */
export const FPS_TARGET = 60;
export const FPS_DISABLE_BELOW = 30;

export type ThemeName = "light" | "dark";

/** WCAG relative luminance contrast ratio, used to test the token palette (NFR-11). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const n = hex.replace("#", "");
    const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
      number,
      number,
      number,
    ];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(hexA), lum(hexB)].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
