import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests: the real app (a dev server on port 3100) against two small fakes in `e2e/`
 * (a fake Supabase on 54399 and a fake Fursa API on 8100), so nothing outside this repo is
 * needed. Every test runs twice: in English (left to right) and in Arabic (right to left).
 *
 *   pnpm test:e2e            uses Playwright's own Chromium (install it once: pnpm exec playwright install chromium)
 *   E2E_CHANNEL=chrome pnpm test:e2e     uses the Chrome that is already installed
 */
const web = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: web,
    channel: process.env.E2E_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "ltr", metadata: { locale: "en", dir: "ltr" } },
    { name: "rtl", metadata: { locale: "ar", dir: "rtl" } },
  ],
  webServer: [
    {
      command: "node e2e/fake-supabase.mjs",
      url: "http://127.0.0.1:54399/auth/v1/user",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "node e2e/fake-api.mjs",
      url: "http://localhost:8100/v1/profile",
      // 401 is an answer: the server is up.
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "node node_modules/next/dist/bin/next dev --port 3100",
      url: `${web}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        SUPABASE_URL: "http://127.0.0.1:54399",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        NEXT_PUBLIC_API_URL: "http://localhost:8100",
        NEXT_PUBLIC_SITE_URL: web,
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
