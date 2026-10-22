import { LegalPage } from "@/components/LegalPage";
import { CookieSettingsButton } from "@/components/CookieConsent";
export const metadata = { title: "Cookie Policy" };
export default function Page() {
  return (
    <LegalPage title="Cookie Policy">
      <h2>Essential cookies (always on)</h2>
      <p>
        Sign-in session cookies from Supabase Auth and a small setting that remembers your cookie choice. Sparkle
        can&apos;t work without them.
      </p>
      <h2>Analytics (off unless you opt in)</h2>
      <p>
        Sparkle does not run analytics today. If we add privacy-friendly analytics later, they will only run after you
        opt in, and never when your browser sends a Global Privacy Control signal.
      </p>
      <h2>Advertising</h2>
      <p>None. We don&apos;t use advertising or cross-site tracking cookies.</p>
      <h2>Your choices</h2>
      <p>
        You can change your choice at any time: <CookieSettingsButton />
      </p>
    </LegalPage>
  );
}
