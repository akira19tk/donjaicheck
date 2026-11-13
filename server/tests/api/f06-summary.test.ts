/** F-06 Aggregate summary — TEST-06-01 … TEST-06-03 */
import { beforeAll, describe, expect, it } from "vitest";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey } from "../helpers/surveys";

type Fixture = Awaited<ReturnType<typeof makeSurvey>>;
let survey: Fixture;
let empty: Fixture;
let ownerCookie: string;
let otherOwnerCookie: string;
let respondentCookie: string;

beforeAll(async () => {
  await resetDb();
  const owner = await createUser("SURVEY_OWNER", "ownerA");
  const otherOwner = await createUser("SURVEY_OWNER", "ownerB");
  survey = await makeSurvey(owner.id, "PUBLISHED", { title: "Dinner" });
  empty = await makeSurvey(owner.id, "PUBLISHED", { title: "No answers yet" });
  ownerCookie = await loginAs(owner.email);
  otherOwnerCookie = await loginAs(otherOwner.email);

  const opt = (label: string) => survey.questions[1].options.find((o) => o.label === label)!.id;
  const submissions = [
    { rating: 5, option: "X", text: "Great food" },
    { rating: 4, option: "X", text: "Friendly staff" },
    { rating: 4, option: "Y", text: "" },
  ];
  for (const [i, s] of submissions.entries()) {
    const r = await createUser("RESPONDENT", `resp${i}`);
    const cookie = await loginAs(r.email);
    if (i === 0) respondentCookie = cookie;
    const answers: unknown[] = [
      { questionId: survey.questions[0].id, rating: s.rating },
      { questionId: survey.questions[1].id, optionId: opt(s.option) },
    ];
    if (s.text) answers.push({ questionId: survey.questions[2].id, text: s.text });
    const res = await api.post(`/api/surveys/${survey.id}/responses`, { answers }, cookie);
    expect(res.status).toBe(201);
  }
});

describe("F-06 summary", () => {
  it("TEST-06-01 aggregates ratings, option counts and texts of the stored responses", async () => {
    const res = await api.get(`/api/owner/surveys/${survey.id}/summary`, ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.responseCount).toBe(3);
    const [rating, choice, text] = res.body.questions;
    expect(rating).toMatchObject({ type: "RATING", answered: 3, average: 4.33, distribution: { "1": 0, "2": 0, "3": 0, "4": 2, "5": 1 } });
    expect(choice.options.map((o: { label: string; count: number }) => [o.label, o.count])).toEqual([
      ["X", 2],
      ["Y", 1],
      ["Z", 0],
    ]);
    expect(text.answered).toBe(2);
    expect([...text.texts].sort()).toEqual(["Friendly staff", "Great food"]);
    expect(JSON.stringify(res.body)).not.toMatch(/resp\d/); // no respondent identity (D-03)
  });

  it("TEST-06-02 a survey without responses returns zero counts and a null average", async () => {
    const res = await api.get(`/api/owner/surveys/${empty.id}/summary`, ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.responseCount).toBe(0);
    expect(res.body.questions[0]).toMatchObject({ answered: 0, average: null });
    expect(res.body.questions[1].options.every((o: { count: number }) => o.count === 0)).toBe(true);
    expect(res.body.questions[2].texts).toEqual([]);
  });

  it("TEST-06-03 another owner gets 404 and a respondent gets 403, without aggregate data", async () => {
    const other = await api.get(`/api/owner/surveys/${survey.id}/summary`, otherOwnerCookie);
    expect(other.status).toBe(404);
    expect(other.body).not.toHaveProperty("questions");
    const resp = await api.get(`/api/owner/surveys/${survey.id}/summary`, respondentCookie);
    expect(resp.status).toBe(403);
    expect(resp.body).not.toHaveProperty("questions");
  });
});
