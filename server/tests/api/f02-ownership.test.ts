/** F-02 ownership — TEST-02-03: another owner's survey is invisible (404) and unchanged */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey, validSurveyBody } from "../helpers/surveys";

let surveyOfA: number;
let publishedOfA: number;
let cookieB: string;

beforeAll(async () => {
  await resetDb();
  const ownerA = await createUser("SURVEY_OWNER", "ownerA");
  const ownerB = await createUser("SURVEY_OWNER", "ownerB");
  surveyOfA = (await makeSurvey(ownerA.id, "DRAFT", { title: "A's draft" })).id;
  publishedOfA = (await makeSurvey(ownerA.id, "PUBLISHED", { title: "A's live survey" })).id;
  cookieB = await loginAs(ownerB.email);
});

describe("TEST-02-03 owner B cannot touch owner A's surveys", () => {
  it("GET returns 404 without data", async () => {
    const res = await api.get(`/api/owner/surveys/${surveyOfA}`, cookieB);
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty("survey");
  });

  it("PUT returns 404 and the survey is unchanged", async () => {
    const res = await api.put(`/api/owner/surveys/${surveyOfA}`, validSurveyBody(), cookieB);
    expect(res.status).toBe(404);
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: surveyOfA } })).title).toBe("A's draft");
  });

  it("publish and close return 404 and the status is unchanged", async () => {
    expect((await api.post(`/api/owner/surveys/${surveyOfA}/publish`, {}, cookieB)).status).toBe(404);
    expect((await api.post(`/api/owner/surveys/${publishedOfA}/close`, {}, cookieB)).status).toBe(404);
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: surveyOfA } })).status).toBe("DRAFT");
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: publishedOfA } })).status).toBe("PUBLISHED");
  });

  it("a non-numeric id is treated as not found", async () => {
    expect((await api.get(`/api/owner/surveys/abc`, cookieB)).status).toBe(404);
  });
});
