import { describe, expect, it } from "vitest";
import { api } from "../helpers/http";

describe("health endpoints", () => {
  it("GET /api/health returns ok", async () => {
    const res = await api.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/ready reports the database as connected", async () => {
    const res = await api.get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
  });
});
