import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// WCAG 2.2 AA automated audit (Team E, DEC-181). Public pages only; signed-in flows follow with test fixtures.
const pages = ["/", "/login", "/privacy", "/terms", "/cookies", "/accessibility", "/do-not-sell"];

for (const path of pages) {
  test(`a11y: ${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}
