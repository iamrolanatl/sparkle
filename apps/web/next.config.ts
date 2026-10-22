import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  transpilePackages: ["@sparkle/ui", "@sparkle/character"],
  // Expose only public values to the browser.
  poweredByHeader: false,
  async headers() {
    const api = (process.env.NEXT_PUBLIC_API_URL ?? "https://sparkle-api.crystal-iamrolan.workers.dev").split(",");
    return [{ source: "/:path*", headers: securityHeaders(process.env.SUPABASE_URL ?? "", api) }];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  },
};

export default nextConfig;

// Enables Cloudflare bindings in `next dev` when running via OpenNext.
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
}
