import { expect, test, type Page } from "@playwright/test";

/*
 * The demo flow end to end: code → identity → a few questions → contact →
 * credit application → confirmation and visit booking, plus the skip path and
 * the copy rules. Needs the microsites API in demo mode with this site's
 * creditApp and appointments flags on (code 123-456-789 → Jordan Mitchell,
 * ABC Motors). The demo lead is ready about 20 s after the response.
 */

const SSN = "219099999"; // a well-formed test number, never 123-45-6789
const DOB = "04121985";

async function toCreditApplication(page: Page) {
  await page.goto("/");
  await page.fill("#code", "123456789");
  await page.getByRole("button", { name: "Find my invitation" }).first().click();
  await page.waitForURL("**/invitation");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Is this you, Jordan");
  await page.getByRole("button", { name: "Yes, that's me" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A little about your situation");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Where should your specialist text you?");
  await page.fill("#phone", "3345550142");
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: /Continue to credit application/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Finish your credit application");
  // Let the step's view transition finish before typing into the new form.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
}

test("the home page leads with the code field and keeps the copy rules", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your auto credit application, already started.");
  await expect(page.locator("#code")).toBeVisible();
  for (const id of ["how", "need", "bring", "faq"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
  const body = page.locator("body");
  await expect(body).not.toContainText(/xcel|fresh start|pre-?qualified|no calls|guaranteed/i);
  await expect(body).toContainText("hard inquiry");
  await expect(body).toContainText("not everyone will qualify");
  // "PIN" appears only where the FAQ says what the mailer may call the code.
  const text = (await body.innerText()).replace(/sometimes labeled PIN/g, "");
  expect(text).not.toMatch(/\bPIN\b/);
});

test("the credit application validates, waits for the lead and sends", async ({ page }) => {
  await toCreditApplication(page);
  await page.getByRole("button", { name: /Authorize and send/ }).click({ force: true });
  await expect(page.getByText("Enter all 9 digits of your Social Security number.")).toBeVisible();
  await expect(page.getByText("Enter your date of birth as MM/DD/YYYY.")).toBeVisible();
  await page.fill("#ssn", SSN);
  await expect(page.locator("#ssn")).toHaveValue("219-09-9999");
  await expect(page.locator("#ssn")).toHaveAttribute("type", "password");
  await page.fill("#dob", DOB);
  await expect(page.locator("#dob")).toHaveValue("04/12/1985");
  await page.locator("label", { hasText: "Fair Credit Reporting Act" }).locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /Authorize and send/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your credit application is on its way", { timeout: 90_000 });
  await expect(page.getByText("Sent to the dealership")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("9999");

  await expect(page.getByRole("heading", { name: /Pick a time to meet your specialist/ })).toBeVisible({ timeout: 30_000 });
  await page.locator('input[name="time"]').first().check({ force: true });
  await page.getByRole("button", { name: "Book this time" }).click();
  await expect(page.getByRole("heading", { name: /You.re booked for/ })).toBeVisible();

  // A refresh keeps the result: the session remembers only that it was sent.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your credit application is on its way");
});

test("skipping the credit application shows the result and lets it reopen", async ({ page }) => {
  await toCreditApplication(page);
  await page.getByRole("button", { name: /Skip for now/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("You're all set, Jordan");
  await expect(page.getByText("Not sent yet")).toBeVisible();
  await page.getByRole("button", { name: /Finish it now/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Finish your credit application");
});
