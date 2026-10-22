/** Sparkle design tokens: glass + cyan/teal neon, high-contrast light/dark. */
export const tokens = {
  color: {
    neon: { cyan: "#22d3ee", teal: "#2dd4bf", glow: "rgba(34, 211, 238, 0.45)" },
    dark: {
      bg: "#05080f",
      surface: "rgba(15, 23, 42, 0.55)",
      border: "rgba(34, 211, 238, 0.35)",
      text: "#f8fafc",
      textMuted: "#cbd5e1",
    },
    light: {
      bg: "#f1f7fb",
      surface: "rgba(255, 255, 255, 0.70)",
      border: "rgba(13, 148, 136, 0.45)",
      text: "#0b1220",
      textMuted: "#334155",
    },
  },
  radius: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
  blur: { glass: "16px" },
  motion: { fast: 0.15, base: 0.3, slow: 0.6 },
} as const;

/** Performance budget (NFR-02): effects target >= 50 fps, auto-disable under 30 fps. */
export const FPS_TARGET = 50;
export const FPS_DISABLE_BELOW = 30;

export type ThemeName = "light" | "dark";

/** WCAG relative luminance contrast ratio, used to test the token palette (NFR-11). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const n = hex.replace("#", "");
    const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(hexA), lum(hexB)].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
