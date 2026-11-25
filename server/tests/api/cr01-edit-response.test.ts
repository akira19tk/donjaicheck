/**
 * CR-01 (Lab 7) — correcting a submitted response (BR-15): TEST-05-09 … TEST-05-12.
 * Old behaviour (D-04): responses are final, there is no route to change one.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey } from "../helpers/surveys";

type Fixture = Awaited<ReturnType<typeof makeSurvey>>;
let owner: { id: number; email: string };
let r1: { id: number; email: string };
let r2: { id: number; email: string };
let cOwner: string, c1: string, c2: string;

const MIN = 60_000;
const answers = (s: Fixture, rating: number, optionIndex = 0) => [
  { questionId: s.questions[0].id, rating },
  { questionId: s.questions[1].id, optionId: s.questions[1].options[optionIndex].id },
];

/** Publishes a survey, lets `cookie` answer with rating 2, then moves submittedAt back by `ageMs`. */
async function answered(cookie: string, ageMs: number, editCount = 0) {
  const s = await makeSurvey(owner.id, "PUBLISHED");
  const post = await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(s, 2) }, cookie);
  expect(post.status).toBe(201);
  const id = post.body.response.id as number;
  const submittedAt = new Date(Date.now() - ageMs);
  await prisma.response.update({ where: { id }, data: { submittedAt, editCount } });
  return { s, id, submittedAt };
}
const storedRating = async (responseId: number, s: Fixture) =>
  (await prisma.answer.findFirstOrThrow({ where: { responseId, questionId: s.questions[0].id } })).ratingValue;

beforeAll(async () => {
  await resetDb();
  owner = await createUser("SURVEY_OWNER");
  r1 = await createUser("RESPONDENT", "r1");
  r2 = await createUser("RESPONDENT", "r2");
  [cOwner, c1, c2] = await Promise.all([owner, r1, r2].map((u) => loginAs(u.email)));
});

describe("CR-01 new behaviour", () => {
  it("TEST-05-09 replaces the answers just before the 30-minute boundary and keeps id and submittedAt", async () => {
    const { s, id, submittedAt } = await answered(c1, 30 * MIN - 5000); // 29 min 55 s old
    const res = await api.put(`/api/responses/${id}`, { answers: answers(s, 5, 1) }, c1);
    expect(res.status).toBe(200);
    expect(res.body.response).toMatchObject({ id, editCount: 1 });
    expect(res.body.response.editedAt).toBeTruthy();

    const stored = await prisma.response.findUniqueOrThrow({ where: { id }, include: { answers: true } });
    expect(stored.submittedAt.toISOString()).toBe(submittedAt.toISOString());
    expect(stored.editCount).toBe(1);
    expect(stored.answers).toHaveLength(2);
    expect(await storedRating(id, s)).toBe(5);
    expect(stored.answers.find((a) => a.questionId === s.questions[1].id)?.optionId).toBe(s.questions[1].options[1].id);
    expect(await prisma.response.count({ where: { surveyId: s.id, respondentId: r1.id } })).toBe(1); // BR-01 kept
  });

  it("TEST-05-10 rejects an edit at exactly 30 minutes", async () => {
    const { s, id } = await answered(c1, 30 * MIN);
    const res = await api.put(`/api/responses/${id}`, { answers: answers(s, 5) }, c1);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EDIT_WINDOW_PASSED");
    expect(await storedRating(id, s)).toBe(2);
  });

  it("TEST-05-10 accepts the 3rd edit and rejects the 4th", async () => {
    const { s, id } = await answered(c1, 1 * MIN, 2);
    const third = await api.put(`/api/responses/${id}`, { answers: answers(s, 4) }, c1);
    expect(third.status).toBe(200);
    expect(third.body.response.editCount).toBe(3);
    const fourth = await api.put(`/api/responses/${id}`, { answers: answers(s, 1) }, c1);
    expect(fourth.status).toBe(409);
    expect(fourth.body.code).toBe("EDIT_LIMIT_REACHED");
    expect(await storedRating(id, s)).toBe(4);
    expect((await prisma.response.findUniqueOrThrow({ where: { id } })).editCount).toBe(3);
  });

  it("TEST-05-11 a closed survey, a passed closing time or invalid answers change nothing", async () => {
    const a = await answered(c1, 1 * MIN);
    await prisma.survey.update({ where: { id: a.s.id }, data: { status: "CLOSED", closedAt: new Date() } });
    const closed = await api.put(`/api/responses/${a.id}`, { answers: answers(a.s, 5) }, c1);
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBe("SURVEY_NOT_OPEN");

    const b = await answered(c1, 1 * MIN);
    await prisma.survey.update({ where: { id: b.s.id }, data: { closesAt: new Date(Date.now() - 1000) } });
    const expired = await api.put(`/api/responses/${b.id}`, { answers: answers(b.s, 5) }, c1);
    expect(expired.status).toBe(409);
    expect(expired.body.code).toBe("SURVEY_NOT_OPEN");

    const c = await answered(c1, 1 * MIN);
    const invalid = await api.put(`/api/responses/${c.id}`, { answers: answers(c.s, 9) }, c1);
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("VALIDATION_FAILED");

    for (const x of [a, b, c]) {
      expect(await storedRating(x.id, x.s)).toBe(2);
      expect((await prisma.response.findUniqueOrThrow({ where: { id: x.id } })).editCount).toBe(0);
    }
  });

  it("TEST-05-12 other respondents get 404, owners 403, and the summary uses the corrected answers once", async () => {
    const { s, id } = await answered(c1, 1 * MIN);
    const other = await api.put(`/api/responses/${id}`, { answers: answers(s, 5) }, c2);
    expect(other.status).toBe(404);
    const byOwner = await api.put(`/api/responses/${id}`, { answers: answers(s, 5) }, cOwner);
    expect(byOwner.status).toBe(403);
    expect(await storedRating(id, s)).toBe(2);

    expect((await api.put(`/api/responses/${id}`, { answers: answers(s, 5) }, c1)).status).toBe(200);
    const summary = await api.get(`/api/owner/surveys/${s.id}/summary`, cOwner);
    expect(summary.body.responseCount).toBe(1);
    const rating = summary.body.questions.find((q: { questionId: number }) => q.questionId === s.questions[0].id);
    expect(rating.average).toBe(5);
  });

  it("GET own response reports whether it can still be edited", async () => {
    const { id } = await answered(c1, 10 * MIN, 1);
    const res = await api.get(`/api/responses/${id}`, c1);
    expect(res.status).toBe(200);
    expect(res.body.response).toMatchObject({ canEdit: true, editCount: 1 });
    expect(new Date(res.body.response.editableUntil).getTime()).toBeGreaterThan(Date.now());
  });
});
