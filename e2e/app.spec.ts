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
  await page.goto(`/${locale}/tracker`);
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
  await page.goto(`/${locale}/tracker`);
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
    `/${locale}/tracker`,
    `/${locale}/profile`,
    `/${locale}/settings`,
  ];
  for (const path of screens) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page);
  }
  // The list view of the pipeline too.
  await page.goto(`/${locale}/tracker`);
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
    `/${locale}/tracker`,
    `/${locale}/profile`,
    `/${locale}/settings`,
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page);
  }
});

test("the old /pipeline address goes to the job tracker", async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);
  await page.goto(`/${locale}/pipeline`);
  await expect(page).toHaveURL(new RegExp(`/${locale}/tracker`));
  await expect(page.getByRole("heading", { level: 1, name: m.pages.pipeline.title })).toBeVisible();
  // The top bar names it too, and marks it as the current page.
  await expect(page.getByRole("link", { name: m.nav.tracker })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("search, filters and the newest sort are answered by the API", async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);
  const f = m.feed.filters;
  const rows = page.getByRole("list", { name: m.feed.jobList }).getByRole("link");
  await page.goto(`/${locale}/feed`);
  await expect(rows).toHaveCount(3);

  // Search: the words go to the API (title, company or place) and into the address.
  const search = page.getByRole("searchbox", { name: f.searchLabel });
  await search.fill("backend");
  await expect(page).toHaveURL(/q=backend/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Backend developer");
  await search.fill("paris");
  await expect(rows).toHaveCount(1); // the place counts too
  await search.fill("");
  await expect(rows).toHaveCount(3);
  await expect(page).not.toHaveURL(/q=/);

  // Filters: work mode, then level on top of it.
  await page.getByRole("button", { name: new RegExp(`^${f.button}`) }).click();
  const panel = page.getByRole("dialog");
  await panel.getByRole("button", { name: m.job.workMode.remote, exact: true }).click();
  await expect(page).toHaveURL(/mode=remote/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Platform engineer");
  await panel
    .getByRole("button", { name: m.profile.seniority.options.junior, exact: true })
    .click();
  await expect(page.getByText(f.noMatch.title)).toBeVisible();
  await panel.getByRole("button", { name: f.clear }).click();
  await expect(rows).toHaveCount(3);
  await expect(page).not.toHaveURL(/mode=|level=/);

  // Minimum score and how recent.
  await panel.getByRole("button", { name: f.scoreAtLeast.replace("{score}", "70") }).click();
  await expect(rows).toHaveCount(1);
  await panel.getByRole("button", { name: f.clear }).click();
  await expect(page).not.toHaveURL(/score=/); // wait for the change before the next choice
  await expect(rows).toHaveCount(3);
  await panel.getByRole("button", { name: f.days["1"] }).click();
  await expect(rows).toHaveCount(2); // posted within a day: the data engineer and the platform engineer
  await panel.getByRole("button", { name: f.clear }).click();
  await expect(page).not.toHaveURL(/days=/);
  await expect(rows).toHaveCount(3);

  // The newest first: the API orders it, not the page.
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: m.feed.sortLabel }).selectOption("newest");
  await expect(page).toHaveURL(/sort=newest/);
  await expect(rows.first()).toContainText("Platform engineer");
  await page.getByRole("combobox", { name: m.feed.sortLabel }).selectOption("best");
  await expect(rows.first()).toContainText("Data engineer");
});

test("a job's company logo is shown, and the others show their initial", async ({
  page,
}, testInfo) => {
  const { locale, m } = where(testInfo);
  await page.route("https://logos.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40"/></svg>',
    }),
  );
  await page.goto(`/${locale}/feed`);
  const list = page.getByRole("list", { name: m.feed.jobList });
  const first = list.getByRole("listitem").first();
  const image = first.locator("[data-slot=company-logo] img");
  await expect(image).toHaveAttribute("src", "https://logos.example.test/example.svg");
  // It really loaded: the page's security policy lets company logos through.
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true);
  // A job with no logo shows the company's initial.
  const second = list.getByRole("listitem").nth(1);
  await expect(second.locator("[data-slot=company-logo] img")).toHaveCount(0);
  await expect(second.locator("[data-slot=company-logo]")).toHaveText("S");

  // The job page shows it too.
  await first.getByRole("link").click();
  await expect(page.locator("article [data-slot=company-logo] img")).toHaveAttribute(
    "src",
    "https://logos.example.test/example.svg",
  );
});

test("the filters panel passes the accessibility check", async ({ page }, testInfo) => {
  const { locale, m } = where(testInfo);
  await page.goto(`/${locale}/feed`);
  await page.getByRole("button", { name: new RegExp(`^${m.feed.filters.button}`) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoA11yViolations(page);
});
