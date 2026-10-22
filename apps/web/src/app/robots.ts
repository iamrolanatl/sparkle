import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// R-13 / DEC-48: stay unindexed until legal review is done and the production domain is live.
export const INDEXING_ENABLED = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXING_ENABLED) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/auth", "/login", "/admin"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
