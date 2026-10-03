import { defineConfig } from "@playwright/test";

/*
  E2E tests for the production build.

  By default they start scripts/serve-build.mjs on build/ (run a build first:
  `npm run build:local`). Point them at another server with BASE_URL, e.g. the
  Apache + PHP stack in tests/server (BASE_URL=http://localhost:8080) or the
  live site.

  Every test runs at 1280px (desktop) and 375px (mobile). Motion is reduced so
  animations sit at their end state; tests about motion turn it back on.
*/
const PORT = Number(process.env.PORT || 4173);
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/.results",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "tests/.report" }]] : [["list"]],
  use: {
    baseURL,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Hostinger's bot check lets a normal Chrome through; a HeadlessChrome UA can get a challenge page.
    userAgent: process.env.BASE_URL
      ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"
      : undefined,
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `node scripts/serve-build.mjs --port ${PORT}`,
        url: `${baseURL}/robots.txt`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
