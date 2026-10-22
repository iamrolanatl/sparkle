import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sparkle/ui", "@sparkle/character"],
  // Expose only public values to the browser.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  },
};

export default nextConfig;

// Enables Cloudflare bindings in `next dev` when running via OpenNext.
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
}
