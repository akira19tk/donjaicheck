/** F-13 Survey duplication — TEST-13-01 … TEST-13-05 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";

let ownerA: { id: number; email: string };
let ownerB: { id: number; email: string };
let rs: { id: number; email: string }[];
let cA: string, cB: string;
let cR: string[];

/** A survey with all four question types, visit codes, a closing time and 2 responses, then CLOSED. */
async function closedSurveyWithHistory(title = "Lunch feedback") {
  const created = await api.post(
    "/api/owner/surveys",
    {
      title,
      description: "Weekly",
      requiresVisitCode: true,
      questions: [
        { text: "Taste", type: "RATING" },
        { text: "Dish", type: "SINGLE_CHOICE", options: ["Pad Thai", "Curry"] },
        { text: "Sides", type: "MULTIPLE_CHOICE", options: ["A", "B", "C"], minSelections: 1, maxSelections: 2 },
        { text: "Comments", type: "TEXT", required: false },
      ],
      closesAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
    cA
  );
  expect(created.status).toBe(201);
  const s = created.body.survey;
  expect((await api.post(`/api/owner/surveys/${s.id}/publish`, {}, cA)).status).toBe(200);
  const codes = (await api.post(`/api/owner/surveys/${s.id}/visit-codes`, { count: 3 }, cA)).body.codes;
  for (let i = 0; i < 2; i++) {
    const post = await api.post(
      `/api/surveys/${s.id}/responses`,
      {
        visitCode: codes[i].code,
        answers: [
          { questionId: s.questions[0].id, rating: 4 },
          { questionId: s.questions[1].id, optionId: s.questions[1].options[0].id },
          { questionId: s.questions[2].id, optionIds: [s.questions[2].options[0].id] },
        ],
      },
      cR[i]
    );
    expect(post.status).toBe(201);
  }
  expect((await api.post(`/api/owner/surveys/${s.id}/close`, {}, cA)).status).toBe(200);
  return s as { id: number; title: string };
}

const shape = (questions: { position: number; text: string; type: string; required: boolean; minSelections: number | null; maxSelections: number | null; options: { label: string }[] }[]) =>
  questions.map((q) => ({ ...q, options: q.options.map((o) => o.label), id: undefined }));

beforeAll(async () => {
  await resetDb();
  ownerA = await createUser("SURVEY_OWNER", "ownerA");
  ownerB = await createUser("SURVEY_OWNER", "ownerB");
  rs = await Promise.all([1, 2].map((i) => createUser("RESPONDENT", `r${i}`)));
  [cA, cB] = await Promise.all([loginAs(ownerA.email), loginAs(ownerB.email)]);
  cR = await Promise.all(rs.map((r) => loginAs(r.email)));
});

describe("F-13 duplicate", () => {
  it("TEST-13-01 a closed survey is copied into a new draft with the same questions in order", async () => {
    const s = await closedSurveyWithHistory();
    const res = await api.post(`/api/owner/surveys/${s.id}/duplicate`, {}, cA);
    expect(res.status).toBe(201);
    const copy = res.body.survey;
    expect(copy.id).not.toBe(s.id);
    expect(copy.status).toBe("DRAFT");
    expect(copy.title).toBe("Copy of Lunch feedback");
    expect(copy.description).toBe("Weekly");
    expect(copy.requiresVisitCode).toBe(true);
    const original = (await api.get(`/api/owner/surveys/${s.id}`, cA)).body.survey;
    const strip = (qs: typeof copy.questions) =>
      qs.map((q: { position: number; text: string; type: string; required: boolean; minSelections: number | null; maxSelections: number | null; options: { label: string }[] }) => ({
        position: q.position, text: q.text, type: q.type, required: q.required,
        minSelections: q.minSelections, maxSelections: q.maxSelections, options: q.options.map((o) => o.label),
      }));
    expect(strip(copy.questions)).toEqual(strip(original.questions));
    expect(shape(copy.questions)).toHaveLength(4);
  });

  it("TEST-13-02 the copy has no responses, codes or schedule; the original is unchanged", async () => {
    const s = await closedSurveyWithHistory("History check");
    const before = await prisma.survey.findUniqueOrThrow({ where: { id: s.id } });
    const res = await api.post(`/api/owner/surveys/${s.id}/duplicate`, {}, cA);
    expect(res.status).toBe(201);
    const copyId = res.body.survey.id;
    expect(res.body.survey).toMatchObject({ responseCount: 0, visitCodeCount: 0, closesAt: null, publishedAt: null, closedAt: null });
    expect(await prisma.response.count({ where: { surveyId: copyId } })).toBe(0);
    expect(await prisma.visitCode.count({ where: { surveyId: copyId } })).toBe(0);

    const after = await prisma.survey.findUniqueOrThrow({ where: { id: s.id } });
    expect(after).toEqual(before);
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(2);
    expect(await prisma.visitCode.count({ where: { surveyId: s.id } })).toBe(3);
  });

  it("TEST-13-03 a 118-character title gives a 120-character copy title", async () => {
    const s = await api.post("/api/owner/surveys", { title: "x".repeat(118), questions: [{ text: "Taste", type: "RATING" }] }, cA);
    const res = await api.post(`/api/owner/surveys/${s.body.survey.id}/duplicate`, {}, cA);
    expect(res.status).toBe(201);
    expect(res.body.survey.title).toHaveLength(120);
  });

  it("TEST-13-04 another owner gets 404 and a respondent 403; nothing is created", async () => {
    const s = await api.post("/api/owner/surveys", { title: "Private", questions: [{ text: "Taste", type: "RATING" }] }, cA);
    const before = await prisma.survey.count();
    expect((await api.post(`/api/owner/surveys/${s.body.survey.id}/duplicate`, {}, cB)).status).toBe(404);
    expect((await api.post(`/api/owner/surveys/${s.body.survey.id}/duplicate`, {}, cR[0])).status).toBe(403);
    expect(await prisma.survey.count()).toBe(before);
  });

  it("TEST-13-05 the copy can be edited and published", async () => {
    const s = await closedSurveyWithHistory("Re-run");
    const copy = (await api.post(`/api/owner/surveys/${s.id}/duplicate`, {}, cA)).body.survey;
    const edit = await api.put(
      `/api/owner/surveys/${copy.id}`,
      { title: "Re-run December", questions: [{ text: "Taste", type: "RATING" }] },
      cA
    );
    expect(edit.status).toBe(200);
    const pub = await api.post(`/api/owner/surveys/${copy.id}/publish`, {}, cA);
    expect(pub.status).toBe(200);
    expect(pub.body.survey.status).toBe("PUBLISHED");
  });
});
