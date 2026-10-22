import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
export const metadata = { title: "Privacy Policy" };
export default function Page() {
  return (
    <LegalPage title="Privacy Policy">
      <h2>1. Summary</h2>
      <p>
        We collect only what Sparkle needs to help students succeed in school. We do not sell personal information and
        do not use student data for targeted advertising.
      </p>
      <h2>2. What we collect</h2>
      <p>
        Account info from Google sign-in (name, email, photo); family and helper links; school data you choose to sync
        or upload (grades, assignments, schedules, class materials); notes you write; messages with Sparkle; basic
        technical logs (with emails and phone numbers removed).
      </p>
      <h2>3. How we use it</h2>
      <p>
        To show your Today view, prioritize work, run the GPA simulator, power Sparkle&apos;s coaching, keep the service
        secure, and provide support.
      </p>
      <h2>4. Children&apos;s and student data (COPPA &amp; FERPA)</h2>
      <p>
        <strong>COPPA:</strong> For students under 13, a parent or guardian creates the account and gives verifiable
        consent before we collect the child&apos;s information. Parents can review, change, or delete their child&apos;s
        information and withdraw consent at any time.
      </p>
      <p>
        <strong>FERPA:</strong> Sparkle is used by families, not on behalf of schools. Education records you import stay
        under your family&apos;s control. Parents keep access to core school records (grades, attendance, assignments,
        schedule, teacher messages) until the student turns 18. Older students may limit access to private notes and AI
        chat history; limits are always visible.
      </p>
      <p>
        Sensitive documents (for example IEP/504 or health forms) are restricted to guardians by default and are not
        shared with helpers unless explicitly granted.
      </p>
      <h2>5. Sharing</h2>
      <p>
        Only with people you invite (read-only, revocable, visible to the student) and with service providers who
        process data for us (hosting, database, AI processing) under contract. AI providers are not allowed to train on
        your data — vendor terms TBD and under review.
      </p>
      <h2>6. Where data is stored and how long</h2>
      <p>
        School passwords: on your own computer by default. Other data: our cloud providers in the United States. Website
        chat logs are deleted after 30 days. Other retention periods: TBD.
      </p>
      <h2>7. Your rights</h2>
      <p>
        Access, correct, delete, and opt out of sale/sharing. Use our{" "}
        <Link href="/do-not-sell" className="underline">
          privacy request form
        </Link>
        . We honor the Global Privacy Control signal.
      </p>
      <h2>8. Security</h2>
      <p>Row-level security, encryption in transit and at rest, audited admin access, and least-privilege roles.</p>
      <h2>9. Contact</h2>
      <p>Privacy contact email: TBD.</p>
    </LegalPage>
  );
}
