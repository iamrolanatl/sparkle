import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Sparkle", short_name: "Sparkle", start_url: "/", display: "standalone", background_color: "#05080f", theme_color: "#05080f", icons: [] };
}
