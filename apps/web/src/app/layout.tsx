import type { Metadata, Viewport } from "next";
import { AuroraBackground } from "@sparkle/ui";
import { SITE_URL } from "@/lib/site";
import { CookieConsent } from "@/components/CookieConsent";
import { ReporterInit } from "@/components/ReporterInit";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const description =
  "Sparkle brings grades, assignments, and class updates into one calm place and shows students what matters next.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Sparkle — School, made calm", template: "%s · Sparkle" },
  description,
  manifest: "/manifest.webmanifest",
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" ? undefined : { index: false, follow: false },
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Sparkle", title: "Sparkle — School, made calm", description, url: "/" },
  twitter: { card: "summary_large_image", title: "Sparkle — School, made calm", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05080f" },
    { media: "(prefers-color-scheme: light)", color: "#f1f7fb" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ReporterInit />
        <ServiceWorker />
        <AuroraBackground />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
