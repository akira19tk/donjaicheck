import { describe, expect, it } from "vitest";
import { api } from "../helpers/http";

describe("health endpoints", () => {
  it("GET /api/health returns ok", async () => {
    const res = await api.get("/api/health");
    expect(res.status).toBe(200);
    // Lab 5 Ep6.6: intentionally broken to prove the merge gate. DO NOT MERGE.
    expect(res.body).toEqual({ status: "broken-on-purpose" });
  });

  it("GET /api/ready reports the database as connected", async () => {
    const res = await api.get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
  });
});
