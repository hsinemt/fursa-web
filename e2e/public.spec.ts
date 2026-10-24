import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, where } from "./helpers";

test("the welcome page has the right language and direction", async ({ page }, testInfo) => {
  const { locale, dir } = where(testInfo);
  await page.goto(`/${locale}`);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.locator("html")).toHaveAttribute("dir", dir);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

for (const kind of ["privacy", "terms"] as const) {
  test(`the ${kind} page is real text, readable and accessible`, async ({ page }, testInfo) => {
    const { locale, dir, m } = where(testInfo);
    await page.goto(`/${locale}/${kind}`);
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    await expect(page.getByRole("heading", { level: 1, name: m.legal[kind].title })).toBeVisible();
    // Every section of the text is on the page, as a heading.
    for (const section of m.legal[kind].sections) {
      await expect(page.getByRole("heading", { level: 2, name: section.heading })).toBeVisible();
    }
    await expect(page.getByText(m.legal.draft)).toBeVisible();
    // No sideways scrolling, even on a phone.
    await page.setViewportSize({ width: 375, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expectNoA11yViolations(page);
  });
}

test("the sign-in page is accessible and mirrors in Arabic", async ({ page }, testInfo) => {
  const { locale, dir } = where(testInfo);
  await page.goto(`/${locale}/login`);
  await expect(page.locator("html")).toHaveAttribute("dir", dir);
  await expectNoA11yViolations(page);
});

test("a protected page sends a signed-out visitor to sign in", async ({ page }, testInfo) => {
  const { locale } = where(testInfo);
  await page.goto(`/${locale}/feed`);
  await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
});
