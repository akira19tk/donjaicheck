/** F-01 Authentication and session — TEST-01-01 … TEST-01-07 (docs/sprints/sprint-1/sts.md) */
import { beforeAll, describe, expect, it } from "vitest";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/prisma";
import { createUser, resetDb, TEST_PASSWORD } from "../helpers/db";
import { api, loginAs } from "../helpers/http";

let ownerEmail: string;
let respondentEmail: string;

beforeAll(async () => {
  await resetDb();
  ownerEmail = (await createUser("SURVEY_OWNER", "ownerA")).email;
  respondentEmail = (await createUser("RESPONDENT", "r1")).email;
});

describe("F-01 login / logout / me", () => {
  it("TEST-01-01 valid login returns the user and sets an httpOnly session cookie", async () => {
    const res = await api.post("/api/auth/login", { email: ownerEmail, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: ownerEmail, role: "SURVEY_OWNER" });
    expect(res.body.user.id).toEqual(expect.any(Number));
    expect(res.body.user).not.toHaveProperty("passwordHash");
    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/^dc_session=[0-9a-f]{64};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("TEST-01-01 email is case-insensitive and trimmed", async () => {
    const res = await api.post("/api/auth/login", { email: `  ${ownerEmail.toUpperCase()} `, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });

  it("TEST-01-02 wrong password returns 401 INVALID_CREDENTIALS and no cookie", async () => {
    const res = await api.post("/api/auth/login", { email: ownerEmail, password: "wrong-password1" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("TEST-01-03 unknown email gives the same response as a wrong password", async () => {
    const wrongPassword = await api.post("/api/auth/login", { email: ownerEmail, password: "wrong-password1" });
    const unknownEmail = await api.post("/api/auth/login", { email: "nobody@test.local", password: "wrong-password1" });
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it("TEST-01-03 missing email and password returns 400 VALIDATION_FAILED", async () => {
    const res = await api.post("/api/auth/login", {});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual(["email", "password"]);
  });

  it("TEST-01-04 logout returns 204, deletes the session and the old cookie stops working", async () => {
    const cookie = await loginAs(respondentEmail);
    const token = cookie.split("=")[1];
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    expect(await prisma.session.count({ where: { tokenHash } })).toBe(1);

    const out = await api.post("/api/auth/logout", {}, cookie);
    expect(out.status).toBe(204);
    expect(await prisma.session.count({ where: { tokenHash } })).toBe(0);

    const me = await api.get("/api/auth/me", cookie);
    expect(me.status).toBe(401);
  });

  it("TEST-01-05 /me returns the current user with a session and 401 without", async () => {
    const cookie = await loginAs(respondentEmail);
    const me = await api.get("/api/auth/me", cookie);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: respondentEmail, role: "RESPONDENT" });

    const anon = await api.get("/api/auth/me");
    expect(anon.status).toBe(401);
    expect(anon.body.code).toBe("UNAUTHENTICATED");
  });

  it("TEST-01-06 passwords are stored only as bcrypt hashes with cost >= 10", async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect(u.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(Number(u.passwordHash.split("$")[2])).toBeGreaterThanOrEqual(10);
      expect(u.passwordHash).not.toBe(TEST_PASSWORD);
      expect(await bcrypt.compare(TEST_PASSWORD, u.passwordHash)).toBe(true);
    }
  });

  it("TEST-01-07 only the SHA-256 hash of the token is stored, and an expired session is rejected", async () => {
    const cookie = await loginAs(respondentEmail);
    const token = cookie.split("=")[1];
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    expect(await prisma.session.count({ where: { tokenHash: token } })).toBe(0);
    const session = await prisma.session.findUniqueOrThrow({ where: { tokenHash } });
    const hours = (session.expiresAt.getTime() - session.createdAt.getTime()) / 3_600_000;
    expect(hours).toBeCloseTo(8, 1);

    await prisma.session.update({ where: { tokenHash }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const me = await api.get("/api/auth/me", cookie);
    expect(me.status).toBe(401);
    expect(await prisma.session.count({ where: { tokenHash } })).toBe(0);
  });

  it("rejects a state-changing request without the CSRF header", async () => {
    const request = (await import("supertest")).default;
    const { app } = await import("../helpers/http");
    const res = await request(app).post("/api/auth/login").send({ email: ownerEmail, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_REJECTED");
  });
});
