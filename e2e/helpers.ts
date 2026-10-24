import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import ar from "../src/messages/ar.json";
import en from "../src/messages/en.json";

export type Messages = typeof en;

/** The language and direction of the current project: English left to right, Arabic right to left. */
export function where(testInfo: TestInfo) {
  const meta = testInfo.project.metadata as { locale: "en" | "ar"; dir: "ltr" | "rtl" };
  return { ...meta, m: (meta.locale === "ar" ? ar : en) as Messages };
}

/** Puts the fake API back to its first state (three new jobs, an empty tracker). */
export async function resetApi(page: Page) {
  await page.request.post("http://localhost:8100/__reset");
}

/** Signs in through the real form (the fake Supabase accepts "right-password"). */
export async function signIn(page: Page, locale: string, m: Messages) {
  await page.goto(`/${locale}/login`);
  await page.getByLabel(m.auth.fields.email, { exact: true }).fill("demo@example.com");
  await page.locator('input[type="password"]').fill("right-password");
  await page.getByRole("button", { name: m.auth.login.submit }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/feed`));
}

/**
 * Checks a page with axe (WCAG 2 A and AA, including color contrast) in the real browser.
 * The Next.js dev overlay is not ours, so it is left out.
 */
export async function expectNoA11yViolations(page: Page) {
  // With reduced motion the page shows its final state at once, so axe never sees a half-faded word.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}
