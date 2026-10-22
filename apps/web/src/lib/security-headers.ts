/**
 * Security headers + CSP for the web app (Team E, OWASP ASVS V14.4, DEC-180).
 * Static CSP: Next.js App Router emits inline bootstrap scripts, so script-src keeps
 * 'unsafe-inline' until nonce-based CSP lands (tracked in RAID). Everything else is locked down.
 */
/** Origin of a Sentry DSN (https://key@oN.ingest.sentry.io/id -> https://oN.ingest.sentry.io), or "". */
export function sentryOrigin(dsn?: string): string {
  try {
    return dsn ? new URL(dsn).origin : "";
  } catch {
    return "";
  }
}

export function contentSecurityPolicy(supabaseUrl: string, apiOrigins: string[] = [], sentryDsn?: string): string {
  const connect = ["'self'", supabaseUrl, supabaseUrl.replace(/^https:/, "wss:"), ...apiOrigins, sentryOrigin(sentryDsn)].filter(Boolean);
  // Sign-in posts to a server action that redirects to Supabase OAuth, then Google.
  const formAction = ["'self'", supabaseUrl, "https://accounts.google.com"].filter(Boolean);
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    `form-action ${formAction.join(" ")}`,
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeaders(supabaseUrl: string, apiOrigins: string[] = [], sentryDsn?: string) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(supabaseUrl, apiOrigins, sentryDsn) },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
