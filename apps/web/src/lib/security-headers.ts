/**
 * Security headers + CSP for the web app (Team E, OWASP ASVS V14.4, DEC-180).
 * Static CSP: Next.js App Router emits inline bootstrap scripts, so script-src keeps
 * 'unsafe-inline' until nonce-based CSP lands (tracked in RAID). Everything else is locked down.
 */
export function contentSecurityPolicy(supabaseUrl: string, apiOrigins: string[] = []): string {
  const connect = ["'self'", supabaseUrl, supabaseUrl.replace(/^https:/, "wss:"), ...apiOrigins].filter(Boolean);
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
    "form-action 'self' https://accounts.google.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeaders(supabaseUrl: string, apiOrigins: string[] = []) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(supabaseUrl, apiOrigins) },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
