import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end checks against the site (port 3321) and the microsites API in demo
 * mode (code 123-456-789). `npm test` starts the dev server if nothing is up;
 * BASE_URL points it at a running build instead. The credit application waits
 * for the demo lead (about 20 s), so those tests run long.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 120_000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3321",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: `${process.env.BASE_URL || "http://localhost:3321"}/api/health`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
