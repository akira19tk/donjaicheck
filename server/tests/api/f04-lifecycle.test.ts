/** F-04 Survey lifecycle — TEST-04-01 … TEST-04-04 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { makeSurvey } from "../helpers/surveys";

let owner: { id: number; email: string };
let cookie: string;

beforeAll(async () => {
  await resetDb();
  owner = await createUser("SURVEY_OWNER");
  cookie = await loginAs(owner.email);
});

describe("F-04 publish and close", () => {
  it("TEST-04-01 publishes an own draft with questions", async () => {
    const s = await makeSurvey(owner.id, "DRAFT");
    const res = await api.post(`/api/owner/surveys/${s.id}/publish`, {}, cookie);
    expect(res.status).toBe(200);
    expect(res.body.survey.status).toBe("PUBLISHED");
    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: s.id } });
    expect(stored.status).toBe("PUBLISHED");
    expect(stored.publishedAt).toBeInstanceOf(Date);
  });

  it("TEST-04-02 closes an own published survey", async () => {
    const s = await makeSurvey(owner.id, "PUBLISHED");
    const res = await api.post(`/api/owner/surveys/${s.id}/close`, {}, cookie);
    expect(res.status).toBe(200);
    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: s.id } });
    expect(stored.status).toBe("CLOSED");
    expect(stored.closedAt).toBeInstanceOf(Date);
  });

  it("TEST-04-03 refuses to publish a draft without questions (409 NO_QUESTIONS)", async () => {
    const s = await makeSurvey(owner.id, "DRAFT", { withQuestions: false });
    const res = await api.post(`/api/owner/surveys/${s.id}/publish`, {}, cookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NO_QUESTIONS");
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: s.id } })).status).toBe("DRAFT");
  });

  it.each([
    ["PUBLISHED", "publish"],
    ["CLOSED", "publish"],
    ["DRAFT", "close"],
    ["CLOSED", "close"],
  ] as const)("TEST-04-04 %s survey + %s -> 409 INVALID_TRANSITION, status unchanged", async (status, action) => {
    const s = await makeSurvey(owner.id, status);
    const res = await api.post(`/api/owner/surveys/${s.id}/${action}`, {}, cookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INVALID_TRANSITION");
    expect((await prisma.survey.findUniqueOrThrow({ where: { id: s.id } })).status).toBe(status);
  });
});
