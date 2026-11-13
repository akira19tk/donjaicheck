/** F-03 Survey authoring — TEST-03-01 … TEST-03-06 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey, validSurveyBody } from "../helpers/surveys";

let ownerA: { id: number; email: string };
let ownerB: { id: number; email: string };
let cookieA: string;
let cookieB: string;

beforeAll(async () => {
  await resetDb();
  ownerA = await createUser("SURVEY_OWNER", "ownerA");
  ownerB = await createUser("SURVEY_OWNER", "ownerB");
  cookieA = await loginAs(ownerA.email);
  cookieB = await loginAs(ownerB.email);
});

describe("F-03 create, edit and list surveys", () => {
  it("TEST-03-01 creates a DRAFT survey owned by the caller with ordered questions and options", async () => {
    const res = await api.post("/api/owner/surveys", validSurveyBody(), cookieA);
    expect(res.status).toBe(201);
    const s = res.body.survey;
    expect(s).toMatchObject({ title: "Dinner experience", status: "DRAFT", responseCount: 0 });
    expect(s.questions.map((q: { position: number; type: string }) => [q.position, q.type])).toEqual([
      [1, "RATING"],
      [2, "SINGLE_CHOICE"],
      [3, "TEXT"],
    ]);
    expect(s.questions[1].options.map((o: { label: string }) => o.label)).toEqual(["Pad Thai", "Tom Yum", "Green curry"]);
    expect(s.questions[2].required).toBe(false);
    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: s.id } });
    expect(stored.ownerId).toBe(ownerA.id);
  });

  it("TEST-03-02 rejects an empty title and 21 questions with field details and stores nothing", async () => {
    const before = await prisma.survey.count();
    const res = await api.post(
      "/api/owner/surveys",
      { title: "", questions: Array.from({ length: 21 }, () => ({ text: "Q", type: "RATING" })) },
      cookieA
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual(["questions", "title"]);
    expect(await prisma.survey.count()).toBe(before);
  });

  it("TEST-03-03 rejects invalid options: 1 option, duplicate labels, options on a rating question", async () => {
    const before = await prisma.survey.count();
    const res = await api.post(
      "/api/owner/surveys",
      {
        title: "Bad options",
        questions: [
          { text: "One", type: "SINGLE_CHOICE", options: ["Only"] },
          { text: "Dup", type: "SINGLE_CHOICE", options: ["A", "a"] },
          { text: "Rate", type: "RATING", options: ["1", "2"] },
        ],
      },
      cookieA
    );
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field)).toEqual([
      "questions[0].options",
      "questions[1].options",
      "questions[2].options",
    ]);
    expect(await prisma.survey.count()).toBe(before);
  });

  it("TEST-03-04 edits an own draft: new title and exactly the new questions", async () => {
    const draft = await makeSurvey(ownerA.id, "DRAFT");
    const res = await api.put(
      `/api/owner/surveys/${draft.id}`,
      {
        title: "Lunch feedback",
        questions: [
          { text: "Service speed", type: "RATING" },
          { text: "Would you come back?", type: "SINGLE_CHOICE", options: ["Yes", "No"] },
        ],
      },
      cookieA
    );
    expect(res.status).toBe(200);
    expect(res.body.survey.title).toBe("Lunch feedback");
    const stored = await prisma.question.findMany({ where: { surveyId: draft.id }, orderBy: { position: "asc" } });
    expect(stored.map((q) => q.text)).toEqual(["Service speed", "Would you come back?"]);
  });

  it.each(["PUBLISHED", "CLOSED"] as const)(
    "TEST-03-05 rejects editing a %s survey with 409 SURVEY_NOT_EDITABLE and changes nothing",
    async (status) => {
      const s = await makeSurvey(ownerA.id, status, { title: `Locked ${status}` });
      const res = await api.put(`/api/owner/surveys/${s.id}`, validSurveyBody(), cookieA);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SURVEY_NOT_EDITABLE");
      const stored = await prisma.survey.findUniqueOrThrow({ where: { id: s.id }, include: { questions: true } });
      expect(stored.title).toBe(`Locked ${status}`);
      expect(stored.questions).toHaveLength(3);
    }
  );

  it("TEST-03-06 lists only the caller's own surveys with status and response count", async () => {
    await makeSurvey(ownerB.id, "PUBLISHED", { title: "Owner B survey" });
    const res = await api.get("/api/owner/surveys", cookieA);
    expect(res.status).toBe(200);
    const titles = res.body.surveys.map((s: { title: string }) => s.title);
    expect(titles).not.toContain("Owner B survey");
    const ownCount = await prisma.survey.count({ where: { ownerId: ownerA.id } });
    expect(res.body.surveys).toHaveLength(ownCount);
    for (const s of res.body.surveys) {
      expect(s).toEqual(expect.objectContaining({ status: expect.any(String), responseCount: expect.any(Number) }));
    }

    const resB = await api.get("/api/owner/surveys", cookieB);
    expect(resB.body.surveys.map((s: { title: string }) => s.title)).toEqual(["Owner B survey"]);
  });
});
