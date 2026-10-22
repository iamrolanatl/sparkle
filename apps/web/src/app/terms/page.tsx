import { LegalPage } from "@/components/LegalPage";
export const metadata = { title: "Terms of Service" };
export default function Page() {
  return (
    <LegalPage title="Terms of Service">
      <h2>1. Who we are</h2>
      <p>Sparkle (&quot;we&quot;) provides a student-success web app. Legal entity name and address: TBD.</p>
      <h2>2. Who can use Sparkle</h2>
      <p>
        Parents or legal guardians create family accounts. Students under 13 may use Sparkle only when a parent or
        guardian sets up and consents to their account. Helpers (for example grandparents, tutors, teachers) use Sparkle
        only with access granted by a guardian or the student.
      </p>
      <h2>3. Your account</h2>
      <p>
        You sign in with Google. Keep your account secure. You are responsible for invitations you send and access you
        grant.
      </p>
      <h2>4. School accounts</h2>
      <p>
        If you connect school portals, you confirm you are allowed to access them. By default, school passwords stay on
        your own computer. You must follow your school&apos;s and each platform&apos;s rules.
      </p>
      <h2>5. AI features</h2>
      <p>
        Sparkle&apos;s AI is a coach. It can be wrong. It does not do schoolwork for students, and you should check
        important information with your school. Nothing is sent to a teacher or school without your explicit
        confirmation.
      </p>
      <h2>6. Acceptable use</h2>
      <p>
        No unlawful, harmful, or harassing use; no attempts to access other people&apos;s data; no scraping or reverse
        engineering beyond what law allows.
      </p>
      <h2>7. Preview status</h2>
      <p>Sparkle is an early preview provided &quot;as is&quot;. Features may change. Pricing is not set.</p>
      <h2>8. Ending use</h2>
      <p>You can stop using Sparkle and ask us to delete your data at any time.</p>
      <h2>9. Liability, disputes and governing law</h2>
      <p>TBD — to be drafted by counsel.</p>
      <h2>10. Contact</h2>
      <p>Contact email: TBD.</p>
    </LegalPage>
  );
}
