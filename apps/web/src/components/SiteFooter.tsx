import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="font-semibold tracking-widest">◆ SPARKLE</span>
      <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link>
        <Link href="/accessibility">Accessibility</Link><Link href="/do-not-sell">Do Not Sell/Share My Personal Information</Link>
      </nav>
      <span className="text-muted">© {new Date().getFullYear()} Sparkle · Preview (draft)</span>
    </footer>
  );
}
