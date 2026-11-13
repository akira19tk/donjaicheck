/**
 * TEST-E2E-01 (AC-05-02, AC-06-01): owner creates + publishes -> customer answers -> owner sees summary.
 * TEST-E2E-02 (AC-05-06): a missing required answer shows an error and keeps the other answers.
 * Requires the seeded demo accounts (npm run prisma:seed) and their passwords in server/.env.
 * Each test creates its own survey, so the results do not depend on earlier data in the database.
 */
import { expect, test, type Page } from "@playwright/test";

const OWNER = { email: "manager@donjai.test", password: process.env.ADMIN_PASSWORD ?? "" };
const CUSTOMER = { email: "customer1@donjai.test", password: process.env.DEMO_USER_PASSWORD ?? "" };
const SHOTS = process.env.E2E_SCREENSHOTS; // optional folder for evidence screenshots

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

const shot = (page: Page, name: string) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());

test("TEST-E2E-01 owner publishes, customer answers, owner sees the summary", async ({ page }) => {
  test.skip(!OWNER.password || !CUSTOMER.password, "Set ADMIN_PASSWORD and DEMO_USER_PASSWORD in server/.env");
  const title = `E2E dinner survey ${Date.now()}`;
  page.on("dialog", (d) => d.accept()); // confirm publish

  // Owner creates a survey with a rating and a single-choice question.
  await login(page, OWNER);
  await expect(page.getByRole("heading", { name: "My surveys" })).toBeVisible();
  await page.getByRole("link", { name: "+ New survey" }).click();
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Question 1 *").fill("How was the taste?");
  await page.getByRole("button", { name: "+ Add question" }).click();
  await page.getByLabel("Question 2 *").fill("Favourite dish");
  await page.getByTestId("question-1").getByLabel("Type").selectOption("SINGLE_CHOICE");
  await page.getByLabel("Question 2 option 1").fill("Pad Thai");
  await page.getByLabel("Question 2 option 2").fill("Green curry");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Survey published.")).toBeVisible();
  await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
  await shot(page, "01-owner-published");
  await logout(page);

  // Customer answers it once and sees the confirmation.
  await login(page, CUSTOMER);
  await expect(page.getByRole("heading", { name: "Available surveys" })).toBeVisible();
  const card = page.locator(".card", { hasText: title });
  await card.getByRole("link", { name: "Answer", exact: true }).click();
  await page.getByRole("radiogroup", { name: "How was the taste?" }).getByText("5", { exact: true }).click();
  await page.getByLabel("Green curry").check();
  await shot(page, "02-customer-answering");
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByText(/Thank you! Your answers were submitted/)).toBeVisible();
  await expect(page.getByText("5 / 5")).toBeVisible();
  await shot(page, "03-customer-confirmation");

  // The list now shows "Answered" and links to the response instead of the form (BR-01 in the UI).
  await page.getByRole("link", { name: "← Back to available surveys" }).click();
  await expect(page.locator(".card", { hasText: title }).getByText("Answered")).toBeVisible();
  await logout(page);

  // Owner sees the aggregate.
  await login(page, OWNER);
  await page.getByRole("link", { name: title }).click();
  await page.getByRole("link", { name: "View summary" }).click();
  await expect(page.getByTestId("response-count")).toHaveText("1");
  await expect(page.getByText("5.00")).toBeVisible();
  await expect(page.getByRole("img", { name: "Green curry: 1" })).toBeVisible();
  await shot(page, "04-owner-summary");
});

test("TEST-E2E-02 a missing required answer shows an error and keeps other answers", async ({ page, request }) => {
  test.skip(!OWNER.password || !CUSTOMER.password, "Set ADMIN_PASSWORD and DEMO_USER_PASSWORD in server/.env");
  // Arrange through the API: a fresh published survey, so the result never depends on earlier
  // manual testing in the same database (customer1 may already have answered the seeded survey).
  const csrf = { "X-Requested-With": "Donjaicheck" };
  const title = `E2E validation survey ${Date.now()}`;
  expect((await request.post("/api/auth/login", { headers: csrf, data: OWNER })).ok()).toBe(true);
  const created = await request.post("/api/owner/surveys", {
    headers: csrf,
    data: {
      title,
      questions: [
        { text: "How was the taste?", type: "RATING", required: true },
        { text: "How fast was the service?", type: "RATING", required: true },
        { text: "Anything we could do better?", type: "TEXT", required: false },
      ],
    },
  });
  expect(created.status()).toBe(201);
  const { survey } = await created.json();
  expect((await request.post(`/api/owner/surveys/${survey.id}/publish`, { headers: csrf })).ok()).toBe(true);

  await login(page, CUSTOMER);
  await page.locator(".card", { hasText: title }).getByRole("link", { name: "Answer", exact: true }).click();
  await page.getByRole("radiogroup", { name: "How was the taste?" }).getByText("4", { exact: true }).click();
  await page.getByLabel("Anything we could do better?").fill("More chilli please");
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByRole("alert")).toContainText("Please answer the highlighted questions.");
  await expect(page.getByText("Required")).toHaveCount(1); // only the unanswered service question
  await expect(page.getByLabel("Anything we could do better?")).toHaveValue("More chilli please");
  await expect(page).toHaveURL(new RegExp(`/surveys/${survey.id}$`)); // stayed on the form
  await shot(page, "05-validation-error");
});
