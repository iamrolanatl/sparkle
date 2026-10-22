import { ImageResponse } from "next/og";

// Placeholder OG image; replace with designed artwork before launch.
export const alt = "Sparkle — school, made calm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80,
        background: "linear-gradient(135deg, #05080f 0%, #0b2a3a 60%, #0f766e 100%)", color: "#f8fafc" }}>
        <div style={{ fontSize: 96, fontWeight: 700, color: "#22d3ee" }}>Sparkle</div>
        <div style={{ fontSize: 44, marginTop: 16 }}>School, made calm. One next step at a time.</div>
      </div>
    ),
    size,
  );
}
