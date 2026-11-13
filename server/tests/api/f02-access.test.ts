/** F-02 Role and ownership enforcement — TEST-02-01, TEST-02-02 (route-table driven) */
import { beforeAll, describe, expect, it } from "vitest";
import { createUser, resetDb } from "../helpers/db";
import { api, loginAs } from "../helpers/http";
import { PROTECTED_ROUTES } from "../helpers/routes";

const call = (method: "get" | "post" | "put", path: string, cookie?: string) =>
  method === "get" ? api.get(path, cookie) : api[method](path, {}, cookie);

let ownerCookie: string;
let respondentCookie: string;

beforeAll(async () => {
  await resetDb();
  ownerCookie = await loginAs((await createUser("SURVEY_OWNER")).email);
  respondentCookie = await loginAs((await createUser("RESPONDENT")).email);
});

describe("F-02 access control", () => {
  it.each(PROTECTED_ROUTES)("TEST-02-01 $method $path returns 401 without a session", async ({ method, path }) => {
    const res = await call(method, path.replace(":id", "1"));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
    expect(Object.keys(res.body).sort()).toEqual(["code", "error"]);
  });

  const ownerOnly = PROTECTED_ROUTES.filter((r) => r.role === "SURVEY_OWNER");
  const respondentOnly = PROTECTED_ROUTES.filter((r) => r.role === "RESPONDENT");

  it.each(ownerOnly.length ? ownerOnly : [{ method: "get" as const, path: "(none yet)", role: "SURVEY_OWNER" as const }])(
    "TEST-02-02 a RESPONDENT gets 403 on owner route $method $path",
    async ({ method, path }) => {
      if (path === "(none yet)") return;
      const res = await call(method, path.replace(":id", "1"), respondentCookie);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    }
  );

  it.each(respondentOnly.length ? respondentOnly : [{ method: "get" as const, path: "(none yet)", role: "RESPONDENT" as const }])(
    "TEST-02-02 a SURVEY_OWNER gets 403 on respondent route $method $path",
    async ({ method, path }) => {
      if (path === "(none yet)") return;
      const res = await call(method, path.replace(":id", "1"), ownerCookie);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    }
  );

  it("unknown API paths return a JSON 404", async () => {
    const res = await api.get("/api/does-not-exist", ownerCookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
