/** F-07 Visit-code eligibility — TEST-07-01 … TEST-07-07 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey } from "../helpers/surveys";

type Fixture = Awaited<ReturnType<typeof makeSurvey>>;
let ownerA: { id: number; email: string };
let ownerB: { id: number; email: string };
let r1: { id: number; email: string };
let r2: { id: number; email: string };
let cA: string, cB: string, c1: string, c2: string;

const answers = (s: Fixture, rating = 4) => [
  { questionId: s.questions[0].id, rating },
  { questionId: s.questions[1].id, optionId: s.questions[1].options[0].id },
];
const addCode = (surveyId: number, code: string) => prisma.visitCode.create({ data: { surveyId, code } });
const restricted = () => makeSurvey(ownerA.id, "PUBLISHED", { requiresVisitCode: true });

beforeAll(async () => {
  await resetDb();
  ownerA = await createUser("SURVEY_OWNER", "ownerA");
  ownerB = await createUser("SURVEY_OWNER", "ownerB");
  r1 = await createUser("RESPONDENT", "r1");
  r2 = await createUser("RESPONDENT", "r2");
  [cA, cB, c1, c2] = await Promise.all([ownerA, ownerB, r1, r2].map((u) => loginAs(u.email)));
});

describe("F-07 owner side", () => {
  it("TEST-07-01 stores requiresVisitCode when a draft is created", async () => {
    const res = await api.post(
      "/api/owner/surveys",
      { title: "Receipt survey", questions: [{ text: "Taste?", type: "RATING" }], requiresVisitCode: true },
      cA
    );
    expect(res.status).toBe(201);
    expect(res.body.survey.requiresVisitCode).toBe(true);
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: res.body.survey.id } })).requiresVisitCode).toBe(true);
  });

  it("TEST-07-02 generates distinct codes for a restricted survey and validates the count", async () => {
    const s = await restricted();
    const res = await api.post(`/api/owner/surveys/${s.id}/visit-codes`, { count: 5 }, cA);
    expect(res.status).toBe(201);
    expect(res.body.codes).toHaveLength(5);
    const codes = res.body.codes.map((c: { code: string }) => c.code);
    expect(new Set(codes).size).toBe(5);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-9]{8}$/);
    expect(await prisma.visitCode.count({ where: { surveyId: s.id } })).toBe(5);

    for (const count of [0, 51, 2.5]) {
      const bad = await api.post(`/api/owner/surveys/${s.id}/visit-codes`, { count }, cA);
      expect(bad.status).toBe(400);
      expect(bad.body.details[0].field).toBe("count");
    }
    expect(await prisma.visitCode.count({ where: { surveyId: s.id } })).toBe(5);

    const list = await api.get(`/api/owner/surveys/${s.id}/visit-codes`, cA);
    expect(list.status).toBe(200);
    expect(list.body.codes).toHaveLength(5);
    expect(list.body.codes[0].usedAt).toBeNull();

    const open = await makeSurvey(ownerA.id, "PUBLISHED");
    const notEnabled = await api.post(`/api/owner/surveys/${open.id}/visit-codes`, { count: 1 }, cA);
    expect(notEnabled.status).toBe(409);
    expect(notEnabled.body.code).toBe("VISIT_CODES_NOT_ENABLED");
  });
});

describe("F-07 respondent side (BR-09)", () => {
  it("TEST-07-03 a valid code (any case, with '-') is accepted and consumed by the response", async () => {
    const s = await restricted();
    await addCode(s.id, "AB3K9QXZ");
    const form = await api.get(`/api/surveys/${s.id}`, c1);
    expect(form.body.survey.requiresVisitCode).toBe(true);

    const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(s), visitCode: "ab3k-9qxz" }, c1);
    expect(res.status).toBe(201);
    const code = await prisma.visitCode.findUniqueOrThrow({ where: { code: "AB3K9QXZ" } });
    expect(code.usedAt).toBeInstanceOf(Date);
    expect(code.responseId).toBe(res.body.response.id);
  });

  it("TEST-07-04 missing, unknown or other-survey codes are rejected and nothing is stored", async () => {
    const s1 = await restricted();
    await addCode(s1.id, "CCCC2222");
    const s2 = await restricted();
    await addCode(s2.id, "DDDD3333");

    const missing = await api.post(`/api/surveys/${s1.id}/responses`, { answers: answers(s1) }, c1);
    expect(missing.status).toBe(400);
    expect(missing.body.details.map((d: { field: string }) => d.field)).toContain("visitCode");

    for (const visitCode of ["ZZZZZZZZ", "DDDD3333"]) {
      const res = await api.post(`/api/surveys/${s1.id}/responses`, { answers: answers(s1), visitCode }, c1);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_VISIT_CODE");
    }
    expect(await prisma.response.count({ where: { surveyId: s1.id } })).toBe(0);
    expect((await prisma.visitCode.findUniqueOrThrow({ where: { code: "DDDD3333" } })).usedAt).toBeNull();
    expect((await prisma.visitCode.findUniqueOrThrow({ where: { code: "CCCC2222" } })).usedAt).toBeNull();
  });

  it("TEST-07-05 a used code is rejected; parallel submissions with one code store exactly one response", async () => {
    const s = await restricted();
    await addCode(s.id, "EEEE4444");
    expect((await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(s), visitCode: "EEEE4444" }, c1)).status).toBe(201);
    const reused = await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(s), visitCode: "EEEE4444" }, c2);
    expect(reused.status).toBe(409);
    expect(reused.body.code).toBe("VISIT_CODE_USED");
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(1);

    const t = await restricted();
    await addCode(t.id, "FFFF5555");
    const results = await Promise.all([
      api.post(`/api/surveys/${t.id}/responses`, { answers: answers(t), visitCode: "FFFF5555" }, c1),
      api.post(`/api/surveys/${t.id}/responses`, { answers: answers(t), visitCode: "FFFF5555" }, c2),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.response.count({ where: { surveyId: t.id } })).toBe(1);
    const code = await prisma.visitCode.findUniqueOrThrow({ where: { code: "FFFF5555" } });
    const winner = results.find((r) => r.status === 201)!;
    expect(code.responseId).toBe(winner.body.response.id);
  });

  it("TEST-07-07 invalid answers with a valid code return 400 and the code stays unused", async () => {
    const s = await restricted();
    await addCode(s.id, "GGGG6666");
    const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(s, 9), visitCode: "GGGG6666" }, c1);
    expect(res.status).toBe(400);
    expect((await prisma.visitCode.findUniqueOrThrow({ where: { code: "GGGG6666" } })).usedAt).toBeNull();
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);
  });

  it("unrestricted surveys still work without a code (Sprint 1 regression)", async () => {
    const s = await makeSurvey(ownerA.id, "PUBLISHED");
    expect((await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(s) }, c1)).status).toBe(201);
  });
});

describe("F-07 access (BR-06, BR-07)", () => {
  it("TEST-07-06 another owner gets 404 and a respondent 403 on the visit-code endpoints", async () => {
    const s = await restricted();
    await addCode(s.id, "HHHH7777");
    for (const [cookie, status] of [
      [cB, 404],
      [c1, 403],
    ] as const) {
      const list = await api.get(`/api/owner/surveys/${s.id}/visit-codes`, cookie);
      expect(list.status).toBe(status);
      expect(list.body.codes).toBeUndefined();
      const gen = await api.post(`/api/owner/surveys/${s.id}/visit-codes`, { count: 3 }, cookie);
      expect(gen.status).toBe(status);
    }
    expect(await prisma.visitCode.count({ where: { surveyId: s.id } })).toBe(1);
  });
});
