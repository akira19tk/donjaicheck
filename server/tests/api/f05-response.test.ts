/** F-05 Survey response — TEST-05-01 … TEST-05-08 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey } from "../helpers/surveys";

type Fixture = Awaited<ReturnType<typeof makeSurvey>>;
let owner: { id: number };
let r1: { id: number; email: string };
let r2: { id: number; email: string };
let cookie1: string;
let cookie2: string;

/** Valid answers for a makeSurvey() fixture: rating, single choice (first option), text. */
const answersFor = (s: Fixture, rating = 4) => [
  { questionId: s.questions[0].id, rating },
  { questionId: s.questions[1].id, optionId: s.questions[1].options.sort((a, b) => a.position - b.position)[0].id },
  { questionId: s.questions[2].id, text: "Lovely evening" },
];

beforeAll(async () => {
  await resetDb();
  owner = await createUser("SURVEY_OWNER");
  r1 = await createUser("RESPONDENT", "r1");
  r2 = await createUser("RESPONDENT", "r2");
  cookie1 = await loginAs(r1.email);
  cookie2 = await loginAs(r2.email);
});

describe("F-05 list and submit", () => {
  it("TEST-05-01 lists only PUBLISHED surveys with hasResponded for the caller", async () => {
    const draft = await makeSurvey(owner.id, "DRAFT", { title: "Draft one" });
    const pubA = await makeSurvey(owner.id, "PUBLISHED", { title: "Published A" });
    const pubB = await makeSurvey(owner.id, "PUBLISHED", { title: "Published B" });
    const closed = await makeSurvey(owner.id, "CLOSED", { title: "Closed one" });
    await prisma.response.create({ data: { surveyId: pubA.id, respondentId: r1.id } });

    const res = await api.get("/api/surveys", cookie1);
    expect(res.status).toBe(200);
    const byTitle = Object.fromEntries(res.body.surveys.map((s: { title: string }) => [s.title, s]));
    expect(Object.keys(byTitle).sort()).toEqual(["Published A", "Published B"]);
    expect(byTitle["Published A"].hasResponded).toBe(true);
    expect(byTitle["Published B"].hasResponded).toBe(false);
    expect([draft.id, closed.id]).not.toContain(pubB.id);
  });

  it("TEST-05-02 stores one response with its answers for a valid submission", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s, 5) }, cookie1);
    expect(res.status).toBe(201);
    expect(res.body.response).toMatchObject({ surveyId: s.id, id: expect.any(Number) });
    expect(new Date(res.body.response.submittedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);

    const stored = await prisma.response.findUniqueOrThrow({ where: { id: res.body.response.id }, include: { answers: true } });
    expect(stored.respondentId).toBe(r1.id);
    expect(stored.answers).toHaveLength(3);
    expect(stored.answers.find((a) => a.questionId === s.questions[0].id)?.ratingValue).toBe(5);
    expect(stored.answers.find((a) => a.questionId === s.questions[2].id)?.textValue).toBe("Lovely evening");
  });

  it("TEST-05-03 rejects a second submission with 409 ALREADY_RESPONDED (also when two arrive at once)", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    expect((await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s) }, cookie1)).status).toBe(201);
    const again = await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s, 1) }, cookie1);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_RESPONDED");
    expect(await prisma.response.count({ where: { surveyId: s.id, respondentId: r1.id } })).toBe(1);

    const fresh = await makeSurvey(owner.id, "PUBLISHED");
    const [a, b] = await Promise.all([
      api.post(`/api/surveys/${fresh.id}/responses`, { answers: answersFor(fresh) }, cookie2),
      api.post(`/api/surveys/${fresh.id}/responses`, { answers: answersFor(fresh) }, cookie2),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.response.count({ where: { surveyId: fresh.id, respondentId: r2.id } })).toBe(1);
  });

  it("TEST-05-04 a DRAFT survey cannot be answered (404) and nothing is stored", async () => {
    const s = await makeSurvey(owner.id, "DRAFT");
    const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s) }, cookie1);
    expect(res.status).toBe(404);
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);
    expect((await api.get(`/api/surveys/${s.id}`, cookie1)).status).toBe(404);
  });

  it("TEST-05-05 a CLOSED survey rejects responses with 409 SURVEY_NOT_OPEN", async () => {
    const s = await makeSurvey(owner.id, "CLOSED");
    const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s) }, cookie1);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SURVEY_NOT_OPEN");
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);
  });

  it("TEST-05-06 invalid values return 400 with one detail per problem and store nothing", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    const other = await makeSurvey(owner.id, "PUBLISHED");
    const cases = [
      { rating: 0 },
      { rating: 6 },
      { rating: 3.5 },
    ];
    for (const c of cases) {
      const answers = answersFor(s);
      answers[0] = { questionId: s.questions[0].id, ...c };
      const res = await api.post(`/api/surveys/${s.id}/responses`, { answers }, cookie1);
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual([{ field: `answers[q:${s.questions[0].id}]`, message: "Rating must be an integer from 1 to 5" }]);
    }
    const res = await api.post(
      `/api/surveys/${s.id}/responses`,
      {
        answers: [
          { questionId: s.questions[0].id, rating: 3 },
          { questionId: s.questions[1].id, optionId: other.questions[1].options[0].id },
          { questionId: s.questions[2].id, text: "x".repeat(501) },
          { questionId: other.questions[0].id, rating: 3 },
        ],
      },
      cookie1
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details.map((d: { message: string }) => d.message).sort()).toEqual(
      ["Invalid option", "Text must be at most 500 characters", "Unknown question"].sort()
    );
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);
  });

  it("TEST-05-07 a missing required answer is rejected; the optional one may be left empty", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    const missing = await api.post(
      `/api/surveys/${s.id}/responses`,
      { answers: [{ questionId: s.questions[1].id, optionId: s.questions[1].options[0].id }] },
      cookie1
    );
    expect(missing.status).toBe(400);
    expect(missing.body.details).toEqual([{ field: `answers[q:${s.questions[0].id}]`, message: "Required" }]);

    const ok = await api.post(
      `/api/surveys/${s.id}/responses`,
      { answers: answersFor(s).slice(0, 2) },
      cookie1
    );
    expect(ok.status).toBe(201);
    expect(await prisma.answer.count({ where: { responseId: ok.body.response.id } })).toBe(2);
  });

  it("TEST-05-08 a respondent reads their own response; another respondent's returns 404", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    const mine = await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s, 2) }, cookie1);
    const theirs = await api.post(`/api/surveys/${s.id}/responses`, { answers: answersFor(s, 5) }, cookie2);

    const own = await api.get(`/api/responses/${mine.body.response.id}`, cookie1);
    expect(own.status).toBe(200);
    expect(own.body.response.survey.id).toBe(s.id);
    expect(own.body.response.answers.map((a: { rating: number | null }) => a.rating)[0]).toBe(2);

    const other = await api.get(`/api/responses/${theirs.body.response.id}`, cookie1);
    expect(other.status).toBe(404);
    expect(other.body).not.toHaveProperty("response");
  });

  it("the database CHECK rejects a rating outside 1–5 even if the API is bypassed", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    const resp = await prisma.response.create({ data: { surveyId: s.id, respondentId: r2.id } });
    await expect(
      prisma.answer.create({ data: { responseId: resp.id, questionId: s.questions[0].id, ratingValue: 9 } })
    ).rejects.toThrow();
  });
});

describe("TEST-03-06 (extended) owner list shows response counts", () => {
  it("counts responses per survey", async () => {
    await resetDb();
    const o = await createUser("SURVEY_OWNER");
    const r = await createUser("RESPONDENT");
    const withResponse = await makeSurvey(o.id, "PUBLISHED", { title: "With one" });
    await makeSurvey(o.id, "PUBLISHED", { title: "With none" });
    await prisma.response.create({ data: { surveyId: withResponse.id, respondentId: r.id } });
    const res = await api.get("/api/owner/surveys", await loginAs(o.email));
    const counts = Object.fromEntries(res.body.surveys.map((s: { title: string; responseCount: number }) => [s.title, s.responseCount]));
    expect(counts).toEqual({ "With one": 1, "With none": 0 });
  });
});
