import request from "supertest";
import { createApp } from "../../src/app";
import { TEST_PASSWORD } from "./db";

export const app = createApp();
export const CSRF = { "X-Requested-With": "Donjaicheck" };

/** Logs in and returns the cookie header to send with later requests. */
export async function loginAs(email: string, password = TEST_PASSWORD): Promise<string> {
  const res = await request(app).post("/api/auth/login").set(CSRF).send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("no session cookie");
  return cookie.split(";")[0];
}

/** Request helpers that always send the CSRF header. */
export const api = {
  get: (path: string, cookie?: string) => request(app).get(path).set(cookie ? { Cookie: cookie } : {}),
  post: (path: string, body: unknown = {}, cookie?: string) =>
    request(app).post(path).set(CSRF).set(cookie ? { Cookie: cookie } : {}).send(body as object),
  put: (path: string, body: unknown = {}, cookie?: string) =>
    request(app).put(path).set(CSRF).set(cookie ? { Cookie: cookie } : {}).send(body as object),
};
