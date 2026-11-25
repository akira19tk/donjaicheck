/** F-10 CSV export — TEST-10-01 … TEST-10-05 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";

let ownerA: { id: number; email: string };
let ownerB: { id: number; email: string };
let rs: { id: number; email: string }[];
let cA: string, cB: string;
let cR: string[];

const csvLines = (text: string) => text.replace(/^﻿/, "").split("\r\n").filter((l) => l !== "");

async function createPublished(body: Record<string, unknown>) {
  const created = await api.post("/api/owner/surveys", body, cA);
  expect(created.status).toBe(201);
  const id = created.body.survey.id as number;
  expect((await api.post(`/api/owner/surveys/${id}/publish`, {}, cA)).status).toBe(200);
  return created.body.survey as { id: number; questions: { id: number; options: { id: number; label: string }[] }[] };
}

beforeAll(async () => {
  await resetDb();
  ownerA = await createUser("SURVEY_OWNER", "ownerA");
  ownerB = await createUser("SURVEY_OWNER", "ownerB");
  rs = await Promise.all([1, 2].map((i) => createUser("RESPONDENT", `r${i}`)));
  [cA, cB] = await Promise.all([loginAs(ownerA.email), loginAs(ownerB.email)]);
  cR = await Promise.all(rs.map((r) => loginAs(r.email)));
});

describe("F-10 CSV export", () => {
  it("TEST-10-01 exports one row per response in submission order with download headers", async () => {
    const s = await createPublished({
      title: "Dinner",
      questions: [
        { text: "Taste", type: "RATING" },
        { text: "Dish", type: "SINGLE_CHOICE", options: ["Pad Thai", "Green curry"] },
        { text: "Comments", type: "TEXT", required: false },
      ],
    });
    const [q1, q2, q3] = s.questions;
    const answers = (rating: number, opt: number, text: string) => [
      { questionId: q1.id, rating },
      { questionId: q2.id, optionId: q2.options[opt].id },
      { questionId: q3.id, text },
    ];
    expect((await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(5, 1, "อร่อยมาก") }, cR[0])).status).toBe(201);
    expect((await api.post(`/api/surveys/${s.id}/responses`, { answers: answers(3, 0, "OK") }, cR[1])).status).toBe(201);

    const res = await api.get(`/api/owner/surveys/${s.id}/export.csv`, cA);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/csv; charset=utf-8/);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="donjaicheck-survey-${s.id}-responses.csv"`);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.text.startsWith("﻿")).toBe(true);
    const lines = csvLines(res.text);
    expect(lines[0]).toBe("response_id,submitted_at,edited_at,respondent_name,respondent_email,Q1 Taste,Q2 Dish,Q3 Comments");
    expect(lines).toHaveLength(3);
    const user1 = await prisma.user.findUniqueOrThrow({ where: { id: rs[0].id } });
    expect(lines[1]).toMatch(new RegExp(`^\\d+,[^,]+Z,,${user1.name},${user1.email},5,Green curry,อร่อยมาก$`));
    expect(lines[2]).toMatch(/,3,Pad Thai,OK$/);
  });

  it("TEST-10-02 quotes special characters and neutralises formulas", async () => {
    const s = await createPublished({ title: "Injection", questions: [{ text: "Comments", type: "TEXT" }] });
    await api.post(`/api/surveys/${s.id}/responses`, { answers: [{ questionId: s.questions[0].id, text: '=HYPERLINK("x")' }] }, cR[0]);
    await api.post(`/api/surveys/${s.id}/responses`, { answers: [{ questionId: s.questions[0].id, text: 'a, "b"' }] }, cR[1]);
    const lines = csvLines((await api.get(`/api/owner/surveys/${s.id}/export.csv`, cA)).text);
    expect(lines[1].endsWith(`,"'=HYPERLINK(""x"")"`)).toBe(true);
    expect(lines[2].endsWith(`,"a, ""b"""`)).toBe(true);
  });

  it("TEST-10-03 multiple choice, visit code column and empty optional answers", async () => {
    const s = await createPublished({
      title: "Receipt",
      requiresVisitCode: true,
      questions: [
        { text: "Sides", type: "MULTIPLE_CHOICE", options: ["A", "B", "C"] },
        { text: "Comments", type: "TEXT", required: false },
      ],
    });
    await prisma.visitCode.create({ data: { surveyId: s.id, code: "KKKK8888" } });
    const [mc] = s.questions;
    const post = await api.post(
      `/api/surveys/${s.id}/responses`,
      { answers: [{ questionId: mc.id, optionIds: [mc.options[1].id, mc.options[0].id] }], visitCode: "KKKK8888" },
      cR[0]
    );
    expect(post.status).toBe(201);
    const lines = csvLines((await api.get(`/api/owner/surveys/${s.id}/export.csv`, cA)).text);
    expect(lines[0]).toBe("response_id,submitted_at,edited_at,respondent_name,respondent_email,visit_code,Q1 Sides,Q2 Comments");
    expect(lines[1].endsWith(",KKKK8888,A; B,")).toBe(true);
  });

  it("TEST-10-04 a survey without responses exports only the header row", async () => {
    const s = await createPublished({ title: "Empty", questions: [{ text: "Taste", type: "RATING" }] });
    const lines = csvLines((await api.get(`/api/owner/surveys/${s.id}/export.csv`, cA)).text);
    expect(lines).toEqual(["response_id,submitted_at,edited_at,respondent_name,respondent_email,Q1 Taste"]);
  });

  it("TEST-10-05 another owner gets 404 and a respondent 403, without CSV", async () => {
    const s = await createPublished({ title: "Private", questions: [{ text: "Taste", type: "RATING" }] });
    const b = await api.get(`/api/owner/surveys/${s.id}/export.csv`, cB);
    expect(b.status).toBe(404);
    expect(b.headers["content-type"]).toMatch(/application\/json/);
    const r = await api.get(`/api/owner/surveys/${s.id}/export.csv`, cR[0]);
    expect(r.status).toBe(403);
    expect(r.text).not.toContain("response_id");
  });
});
