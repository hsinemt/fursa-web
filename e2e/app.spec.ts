import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, resetApi, signIn, where } from "./helpers";

const FIRST_JOB = "11111111-1111-4111-8111-111111111111";

test.beforeEach(async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);
  await resetApi(page);
  await signIn(page, locale, m);
});

test("feed to job to pipeline: save a job and move it along", async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);

  // The feed lists the three matches, best first.
  const rows = page.getByRole("list", { name: m.feed.jobList }).getByRole("link");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Data engineer");

  // Open the best one, then save it.
  await rows.first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/jobs/`));
  await expect(page.getByRole("heading", { level: 1, name: "Data engineer" })).toBeVisible();
  await page.getByRole("button", { name: m.job.save, exact: true }).click();
  await expect(page.getByRole("button", { name: m.job.unsave })).toBeVisible();

  // The description has a summary of its parts, and the full posting on demand.
  const description = page.locator("section", {
    has: page.getByRole("heading", { name: m.job.description.title }),
  });
  await expect(
    description.getByRole("heading", { name: m.job.description.sections.responsibilities }),
  ).toBeVisible();
  await description.getByRole("button", { name: m.job.description.full }).click();
  await expect(description.getByText("We build data tools.")).toBeVisible();

  // It is now in the Saved column of the pipeline; move it to Applied with the menu.
  await page.goto(`/${locale}/pipeline`);
  const saved = page.getByRole("region", { name: m.status.saved });
  await expect(saved.getByRole("link", { name: "Data engineer" })).toBeVisible();
  await page
    .getByRole("button", { name: m.pipeline.moveMenu.replace("{title}", "Data engineer") })
    .click();
  await page.getByRole("menuitem", { name: m.status.applied }).click();
  const applied = page.getByRole("region", { name: m.status.applied });
  await expect(applied.getByRole("link", { name: "Data engineer" })).toBeVisible();
  await expect(saved.getByRole("link", { name: "Data engineer" })).toHaveCount(0);

  // The list view shows it with the stepper.
  await page.getByRole("button", { name: m.pipeline.view.list, exact: true }).click();
  await expect(
    page.getByRole("list", {
      name: m.pipeline.stepper.label.replace("{title}", "Data engineer"),
    }),
  ).toBeVisible();
});

test("the pipeline board moves a card by dragging it", async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);
  await page.request.put(`http://localhost:8100/v1/jobs/${FIRST_JOB}/status`, {
    data: { status: "saved" },
    headers: { Origin: "http://localhost:3100", Cookie: "fursa_access_token=x" },
  });
  await page.goto(`/${locale}/pipeline`);
  const card = page.locator('[data-slot="board-card"]', { hasText: "Data engineer" });
  await expect(card).toBeVisible();
  const target = page.getByRole("region", { name: m.status.interview });
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  expect(from && to).toBeTruthy();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + 30);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(target.getByRole("link", { name: "Data engineer" })).toBeVisible();
});

test("settings: change the alerts and save, then use the account menu", async ({
  page,
}, testInfo) => {
  const { locale, dir, m } = where(testInfo);
  await page.goto(`/${locale}/settings`);
  await page.getByRole("checkbox", { name: m.settings.alerts.email }).check();
  await page.getByRole("button", { name: m.settings.alerts.save }).click();
  await expect(page.getByText(m.settings.alerts.saved)).toBeVisible();

  // The account menu: appearance, then sign out.
  await page.getByRole("button", { name: m.nav.accountMenu }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toHaveAttribute("dir", dir);
  await menu.getByRole("menuitemradio", { name: m.theme.dark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: m.nav.accountMenu }).click();
  await page.getByRole("menuitem", { name: m.auth.signOut }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
});

test("every signed-in screen passes the accessibility check", async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);
  const screens = [
    `/${locale}/feed`,
    `/${locale}/jobs/${FIRST_JOB}`,
    `/${locale}/pipeline`,
    `/${locale}/profile`,
    `/${locale}/settings`,
  ];
  for (const path of screens) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page);
  }
  // The list view of the pipeline too.
  await page.goto(`/${locale}/pipeline`);
  await page.getByRole("button", { name: m.pipeline.view.list, exact: true }).click();
  await expectNoA11yViolations(page);
});

test("the main signed-in screens pass the accessibility check in dark mode", async ({
  page,
}, testInfo) => {
  const { locale } = where(testInfo);
  await page
    .context()
    .addCookies([{ name: "fursa-theme", value: "dark", url: "http://localhost:3100" }]);
  for (const path of [
    `/${locale}/feed`,
    `/${locale}/jobs/${FIRST_JOB}`,
    `/${locale}/pipeline`,
    `/${locale}/profile`,
    `/${locale}/settings`,
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page);
  }
});
