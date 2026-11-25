/** F-09 Multiple-choice questions — TEST-09-01 … TEST-09-06 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";

let owner: { id: number; email: string };
let rs: { id: number; email: string }[];
let cOwner: string;
let cR: string[];

const mcBody = () => ({
  title: "Side dishes",
  questions: [
    { text: "Which sides did you order?", type: "MULTIPLE_CHOICE", options: ["A", "B", "C", "D"], minSelections: 1, maxSelections: 2 },
    { text: "Which drinks?", type: "MULTIPLE_CHOICE", required: false, options: ["Tea", "Coffee", "Water"] },
  ],
});

/** Creates and publishes the multiple-choice survey through the API; returns question/option ids. */
async function publishedMcSurvey() {
  const created = await api.post("/api/owner/surveys", mcBody(), cOwner);
  expect(created.status).toBe(201);
  const id = created.body.survey.id;
  expect((await api.post(`/api/owner/surveys/${id}/publish`, {}, cOwner)).status).toBe(200);
  const q = created.body.survey.questions[0];
  const opt = Object.fromEntries(q.options.map((o: { label: string; id: number }) => [o.label, o.id]));
  return { id, qid: q.id as number, opt, other: created.body.survey.questions[1] };
}

beforeAll(async () => {
  await resetDb();
  owner = await createUser("SURVEY_OWNER");
  rs = await Promise.all([1, 2, 3, 4].map((i) => createUser("RESPONDENT", `r${i}`)));
  cOwner = await loginAs(owner.email);
  cR = await Promise.all(rs.map((r) => loginAs(r.email)));
});

describe("F-09 authoring", () => {
  it("TEST-09-01 creates MULTIPLE_CHOICE questions with limits and defaults", async () => {
    const res = await api.post("/api/owner/surveys", mcBody(), cOwner);
    expect(res.status).toBe(201);
    const [q1, q2] = res.body.survey.questions;
    expect(q1).toMatchObject({ type: "MULTIPLE_CHOICE", minSelections: 1, maxSelections: 2 });
    expect(q1.options.map((o: { label: string }) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(q2).toMatchObject({ type: "MULTIPLE_CHOICE", required: false, minSelections: 0, maxSelections: 3 });
    const stored = await prisma.question.findUniqueOrThrow({ where: { id: q1.id } });
    expect([stored.minSelections, stored.maxSelections]).toEqual([1, 2]);
  });

  it("TEST-09-02 rejects invalid definitions and creates nothing", async () => {
    const before = await prisma.survey.count();
    const res = await api.post(
      "/api/owner/surveys",
      {
        title: "Bad",
        questions: [
          { text: "One option", type: "MULTIPLE_CHOICE", options: ["Only"] },
          { text: "Min > max", type: "MULTIPLE_CHOICE", options: ["A", "B", "C"], minSelections: 3, maxSelections: 2 },
          { text: "Max too big", type: "MULTIPLE_CHOICE", options: ["A", "B"], maxSelections: 3 },
          { text: "Required min 0", type: "MULTIPLE_CHOICE", options: ["A", "B"], minSelections: 0 },
        ],
      },
      cOwner
    );
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field)).toEqual([
      "questions[0].options",
      "questions[1].minSelections",
      "questions[2].maxSelections",
      "questions[3].minSelections",
    ]);
    expect(await prisma.survey.count()).toBe(before);
  });
});

describe("F-09 answering and results", () => {
  it("TEST-09-03 stores one Answer with one AnswerOption per selected option", async () => {
    const s = await publishedMcSurvey();
    const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: [{ questionId: s.qid, optionIds: [s.opt.A, s.opt.B] }] }, cR[0]);
    expect(res.status).toBe(201);
    const answers = await prisma.answer.findMany({ where: { responseId: res.body.response.id }, include: { selections: true } });
    expect(answers).toHaveLength(1);
    expect(answers[0].selections.map((x) => x.optionId).sort()).toEqual([s.opt.A, s.opt.B].sort());
  });

  it("TEST-09-04 rejects selections outside the rules and stores nothing", async () => {
    const s = await publishedMcSurvey();
    const cases: [unknown, string][] = [
      [[], "Required"],
      [[s.opt.A, s.opt.B, s.opt.C], "Select at most 2"],
      [[s.opt.A, s.opt.A], "Invalid selection"],
      [[s.other.options[0].id], "Invalid option"],
    ];
    for (const [optionIds, message] of cases) {
      const res = await api.post(`/api/surveys/${s.id}/responses`, { answers: [{ questionId: s.qid, optionIds }] }, cR[1]);
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual([{ field: `answers[q:${s.qid}]`, message }]);
    }
    expect(await prisma.response.count({ where: { surveyId: s.id } })).toBe(0);
  });

  it("TEST-09-05 summary counts respondents per option", async () => {
    const s = await publishedMcSurvey();
    const picks = [[s.opt.A, s.opt.B], [s.opt.A], [s.opt.C]];
    for (let i = 0; i < picks.length; i++) {
      const r = await api.post(`/api/surveys/${s.id}/responses`, { answers: [{ questionId: s.qid, optionIds: picks[i] }] }, cR[i]);
      expect(r.status).toBe(201);
    }
    const res = await api.get(`/api/owner/surveys/${s.id}/summary`, cOwner);
    expect(res.status).toBe(200);
    const item = res.body.questions.find((q: { questionId: number }) => q.questionId === s.qid);
    expect(item.type).toBe("MULTIPLE_CHOICE");
    expect(item.answered).toBe(3);
    expect(Object.fromEntries(item.options.map((o: { label: string; count: number }) => [o.label, o.count]))).toEqual({ A: 2, B: 1, C: 1, D: 0 });
  });

  it("TEST-09-06 the respondent sees all selected labels on their own response", async () => {
    const s = await publishedMcSurvey();
    const post = await api.post(`/api/surveys/${s.id}/responses`, { answers: [{ questionId: s.qid, optionIds: [s.opt.B, s.opt.A] }] }, cR[3]);
    expect(post.status).toBe(201);
    const res = await api.get(`/api/responses/${post.body.response.id}`, cR[3]);
    expect(res.status).toBe(200);
    expect(res.body.response.answers[0].optionLabels).toEqual(["A", "B"]);
  });
});
