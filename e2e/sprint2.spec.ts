/**
 * TEST-E2E-03 (AC-07-03, AC-09-03): owner creates a restricted survey with a multiple-choice question and
 * generates a visit code; a customer answers with the code and two options; the confirmation shows both labels.
 * TEST-E2E-CR01 (CR-01, AC-05-08): the customer corrects the rating within 30 minutes and sees the new value.
 * Requires the seeded demo accounts and their passwords in server/.env (same as journey.spec.ts).
 */
import { expect, test, type Page } from "@playwright/test";

const OWNER = { email: "manager@donjai.test", password: process.env.ADMIN_PASSWORD ?? "" };
const CUSTOMER = { email: "customer2@donjai.test", password: process.env.DEMO_USER_PASSWORD ?? "" };
const SHOTS = process.env.E2E_SCREENSHOTS;
const shot = (page: Page, name: string) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email *").fill(who.email);
  await page.getByLabel("Password *").fill(who.password);
  await page.getByRole("button", { name: "Log in" }).click();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("TEST-E2E-03 visit code + multiple choice, then TEST-E2E-CR01 correct the answers", async ({ page }) => {
  test.skip(!OWNER.password || !CUSTOMER.password, "Set ADMIN_PASSWORD and DEMO_USER_PASSWORD in server/.env");
  const title = `E2E receipt survey ${Date.now()}`;
  page.on("dialog", (d) => d.accept());

  // Owner: restricted survey with a rating and a multiple-choice question; publish; generate one code.
  await login(page, OWNER);
  await page.getByRole("link", { name: "+ New survey" }).click();
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel(/Require a visit code/).check();
  await page.getByLabel("Question 1 *").fill("How was the taste?");
  await page.getByRole("button", { name: "+ Add question" }).click();
  await page.getByLabel("Question 2 *").fill("Which sides did you order?");
  await page.getByTestId("question-1").getByLabel("Type").selectOption("MULTIPLE_CHOICE");
  await page.getByLabel("Question 2 option 1").fill("Sticky rice");
  await page.getByLabel("Question 2 option 2").fill("Som tam");
  await page.getByRole("button", { name: "+ Add option" }).click();
  await page.getByLabel("Question 2 option 3").fill("Spring rolls");
  await page.getByTestId("question-1").getByLabel("Max selections").fill("2");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
  await page.getByLabel("Number of codes").fill("1");
  await page.getByRole("button", { name: "Generate codes" }).click();
  const codeCell = page.locator("table.codes code").first();
  await expect(codeCell).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const code = (await codeCell.textContent())!.trim();
  await shot(page, "e2e03-owner-codes");
  await logout(page);

  // Customer: answer with the code (lower case) and two options.
  await login(page, CUSTOMER);
  await page.locator(".card", { hasText: title }).getByRole("link", { name: "Answer", exact: true }).click();
  await expect(page.getByText("Choose 1–2")).toBeVisible();
  await page.getByLabel(/Visit code/).fill(code.toLowerCase());
  await page.getByRole("radiogroup", { name: "How was the taste?" }).getByText("2", { exact: true }).click();
  await page.getByLabel("Som tam").check();
  await page.getByLabel("Sticky rice").check();
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByText(/Thank you! Your answers were submitted/)).toBeVisible();
  await expect(page.getByText("Sticky rice, Som tam")).toBeVisible();
  await expect(page.getByText("2 / 5")).toBeVisible();
  await shot(page, "e2e03-customer-confirmation");

  // CR-01: correct the rating within the 30-minute window.
  await expect(page.getByText(/3 edits left/)).toBeVisible();
  await page.getByRole("link", { name: "Edit my answers" }).click();
  await expect(page.getByLabel("Sticky rice")).toBeChecked();
  await page.getByRole("radiogroup", { name: "How was the taste?" }).getByText("5", { exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your answers were updated.")).toBeVisible();
  await expect(page.getByText("5 / 5")).toBeVisible();
  await expect(page.getByText(/2 edits left/)).toBeVisible();
  await shot(page, "e2ecr01-customer-edited");
  await logout(page);

  // Owner: the code is used and the summary has one response with the corrected rating.
  await login(page, OWNER);
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByText(/1 of 1 used/)).toBeVisible();
  await page.getByRole("link", { name: "View summary" }).click();
  await expect(page.getByTestId("response-count")).toHaveText("1");
  await expect(page.getByText("5.00")).toBeVisible();
  await expect(page.getByRole("img", { name: "Sticky rice: 1" })).toBeVisible();
});

test("TEST-E2E-05 (F-13) owner duplicates a survey and lands in the editor of the copy", async ({ page }) => {
  test.skip(!OWNER.password, "Set ADMIN_PASSWORD in server/.env");
  const title = `E2E duplicate ${Date.now()}`;
  await login(page, OWNER);
  await page.getByRole("link", { name: "+ New survey" }).click();
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Question 1 *").fill("How was the service?");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByText("Copy created — edit and publish when ready.")).toBeVisible();
  await expect(page.getByLabel("Title *")).toHaveValue(`Copy of ${title}`);
  await expect(page.getByLabel("Question 1 *")).toHaveValue("How was the service?");
  await shot(page, "e2e05-duplicate");
});
