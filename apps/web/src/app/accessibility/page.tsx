import { LegalPage } from "@/components/LegalPage";
export const metadata = { title: "Accessibility Statement" };
export default function Page() {
  return (
    <LegalPage title="Accessibility Statement">
      <p>
        We want Sparkle to work for every student and family. Our target is <strong>WCAG 2.2 Level AA</strong>.
      </p>
      <h2>What we do</h2>
      <p>
        High-contrast light and dark themes; readable text; keyboard navigation and visible focus; screen-reader labels;
        animations that switch off with &quot;reduce motion&quot;, data saver, or slow devices; plain language at about
        a grade-8 reading level.
      </p>
      <h2>Known limits</h2>
      <p>
        Sparkle is an early preview and has not yet had a formal accessibility audit. The Sparkle robot animation is
        decorative and has a text description.
      </p>
      <h2>Feedback</h2>
      <p>
        If something is hard to use, tell us and we&apos;ll work on it. Accessibility contact: TBD (email). You can also
        use &quot;Talk to a human&quot; in the Questions chat.
      </p>
    </LegalPage>
  );
}
