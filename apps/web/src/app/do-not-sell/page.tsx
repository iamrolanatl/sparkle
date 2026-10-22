import { LegalPage } from "@/components/LegalPage";
import { PrivacyRequestForm } from "./PrivacyRequestForm";
export const metadata = { title: "Do Not Sell or Share My Personal Information" };
export default function Page() {
  return (
    <LegalPage title="Do Not Sell or Share My Personal Information">
      <p>
        Sparkle does not sell personal information and does not share it for cross-context behavioral advertising. Under
        the California Consumer Privacy Act as amended by CPRA (and similar state laws), you can still ask us to opt you
        out, or to access, correct, or delete your information.
      </p>
      <p>
        We honor the <strong>Global Privacy Control (GPC)</strong> signal automatically as an opt-out request.
      </p>
      <PrivacyRequestForm />
    </LegalPage>
  );
}
