import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  transpilePackages: ["@sparkle/ui"],
  // Expose only public values to the browser.
  poweredByHeader: false,
  async headers() {
    const api = (process.env.NEXT_PUBLIC_API_URL ?? "https://sparkle-api.crystal-iamrolan.workers.dev").split(",");
    // Static CSP for public/prerendered pages; signed-in routes get a nonce CSP from middleware (DEC-186).
    const all = securityHeaders(process.env.SUPABASE_URL ?? "", api, process.env.NEXT_PUBLIC_SENTRY_DSN);
    const noCsp = all.filter((h) => h.key !== "Content-Security-Policy");
    return [
      { source: "/((?!app(?:/|$)|admin(?:/|$)|invite(?:/|$)).*)", headers: all },
      { source: "/:p(app|admin|invite)/:rest*", headers: noCsp },
      { source: "/:p(app|admin|invite)", headers: noCsp },
    ];
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
