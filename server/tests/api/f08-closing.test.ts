/** F-08 Scheduled closing — TEST-08-01 … TEST-08-06 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey } from "../helpers/surveys";

type Fixture = Awaited<ReturnType<typeof makeSurvey>>;
let ownerA: { id: number; email: string };
let ownerB: { id: number; email: string };
let r1: { id: number; email: string };
let cookieA: string;
let cookieB: string;
let cookieR1: string;

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000);
const validAnswers = (s: Fixture) => [
  { questionId: s.questions[0].id, rating: 4 },
  { questionId: s.questions[1].id, optionId: s.questions[1].options[0].id },
];

beforeAll(async () => {
  await resetDb();
  ownerA = await createUser("SURVEY_OWNER", "ownerA");
  ownerB = await createUser("SURVEY_OWNER", "ownerB");
  r1 = await createUser("RESPONDENT", "r1");
  [cookieA, cookieB, cookieR1] = await Promise.all([loginAs(ownerA.email), loginAs(ownerB.email), loginAs(r1.email)]);
});

describe("F-08 set and clear the closing time", () => {
  it("TEST-08-01 sets a future closing time on DRAFT and PUBLISHED surveys and clears it with null", async () => {
    for (const status of ["DRAFT", "PUBLISHED"] as const) {
      const s = await makeSurvey(ownerA.id, status);
      const when = inMinutes(120).toISOString();
      const res = await api.put(`/api/owner/surveys/${s.id}/closing`, { closesAt: when }, cookieA);
      expect(res.status).toBe(200);
      expect(res.body.survey.closesAt).toBe(when);
      expect((await prisma.survey.findUniqueOrThrow({ where: { id: s.id } })).closesAt?.toISOString()).toBe(when);

      const cleared = await api.put(`/api/owner/surveys/${s.id}/closing`, { closesAt: null }, cookieA);
      expect(cleared.status).toBe(200);
      expect(cleared.body.survey.closesAt).toBeNull();
      expect((await prisma.survey.findUniqueOrThrow({ where: { id: s.id } })).closesAt).toBeNull();
    }
  });

  it("TEST-08-01 accepts closesAt when a draft is created", async () => {
    const when = inMinutes(60).toISOString();
    const res = await api.post(
      "/api/owner/surveys",
      { title: "Lunch", questions: [{ text: "Taste?", type: "RATING" }], closesAt: when },
      cookieA
    );
    expect(res.status).toBe(201);
    expect(res.body.survey.closesAt).toBe(when);
  });

  it("TEST-08-02 rejects an invalid, past or too distant closing time and keeps the stored value", async () => {
    const s = await makeSurvey(ownerA.id, "PUBLISHED");
    const kept = inMinutes(30);
    await prisma.survey.update({ where: { id: s.id }, data: { closesAt: kept } });
    for (const closesAt of ["abc", inMinutes(-5).toISOString(), inMinutes(400 * 24 * 60).toISOString()]) {
      const res = await api.put(`/api/owner/surveys/${s.id}/closing`, { closesAt }, cookieA);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(res.body.details.map((d: { field: string }) => d.field)).toEqual(["closesAt"]);
    }
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: s.id } })).closesAt?.toISOString()).toBe(kept.toISOString());
  });
});

describe("F-08 deadline enforcement (BR-11)", () => {
  it("TEST-08-03 a published survey whose closing time passed is closed for respondents", async () => {
    const s = await makeSurvey(ownerA.id, "PUBLISHED", { title: "Expired survey" });
    const deadline = new Date(Date.now() - 1000);
    await prisma.survey.update({ where: { id: s.id }, data: { closesAt: deadline } });

    const list = await api.get("/api/surveys", cookieR1);
    expect(list.status).toBe(200);
    expect(list.body.surveys.map((x: { title: string }) => x.title)).not.toContain("Expired survey");

    const one = await api.get(`/api/surveys/${s.id}`, cookieR1);
    expect(one.status).toBe(200);
    expect(one.body.survey.status).toBe("CLOSED");

    const post = await api.post(`/api/surveys/${s.id}/responses`, { answers: validAnswers(s) }, cookieR1);
    expect(post.status).toBe(409);
    expect(post.body.code).toBe("SURVEY_NOT_OPEN");
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);

    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: s.id } });
    expect(stored.status).toBe("CLOSED");
    expect(stored.closedAt?.toISOString()).toBe(deadline.toISOString());
  });

  it("TEST-08-03 a submission after the deadline is rejected even when nothing read the survey first", async () => {
    const s = await makeSurvey(ownerA.id, "PUBLISHED");
    await prisma.survey.update({ where: { id: s.id }, data: { closesAt: new Date(Date.now() - 1000) } });
    const post = await api.post(`/api/surveys/${s.id}/responses`, { answers: validAnswers(s) }, cookieR1);
    expect(post.status).toBe(409);
    expect(post.body.code).toBe("SURVEY_NOT_OPEN");
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);
  });

  it("TEST-08-04 accepts a response one minute before the closing time", async () => {
    const s = await makeSurvey(ownerA.id, "PUBLISHED");
    await prisma.survey.update({ where: { id: s.id }, data: { closesAt: inMinutes(1) } });
    const post = await api.post(`/api/surveys/${s.id}/responses`, { answers: validAnswers(s) }, cookieR1);
    expect(post.status).toBe(201);
    const one = await api.get(`/api/surveys/${s.id}`, cookieR1);
    expect(one.body.survey.status).toBe("PUBLISHED");
    expect(one.body.survey.closesAt).toBeTruthy();
  });

  it("TEST-08-05 a closed survey's closing time cannot change; a draft past its closing time cannot be published", async () => {
    const closed = await makeSurvey(ownerA.id, "CLOSED");
    const res = await api.put(`/api/owner/surveys/${closed.id}/closing`, { closesAt: inMinutes(60).toISOString() }, cookieA);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SURVEY_CLOSED");

    const draft = await makeSurvey(ownerA.id, "DRAFT");
    await prisma.survey.update({ where: { id: draft.id }, data: { closesAt: new Date(Date.now() - 1000) } });
    const pub = await api.post(`/api/owner/surveys/${draft.id}/publish`, {}, cookieA);
    expect(pub.status).toBe(409);
    expect(pub.body.code).toBe("CLOSING_TIME_PASSED");
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("DRAFT");
  });

  it("TEST-08-06 another owner gets 404 and a respondent gets 403; nothing changes", async () => {
    const s = await makeSurvey(ownerA.id, "PUBLISHED");
    const body = { closesAt: inMinutes(60).toISOString() };
    const b = await api.put(`/api/owner/surveys/${s.id}/closing`, body, cookieB);
    expect(b.status).toBe(404);
    const r = await api.put(`/api/owner/surveys/${s.id}/closing`, body, cookieR1);
    expect(r.status).toBe(403);
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: s.id } })).closesAt).toBeNull();
  });
});
