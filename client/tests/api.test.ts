import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "../src/api";

afterEach(() => vi.restoreAllMocks());

describe("apiFetch", () => {
  it("sends the CSRF header and credentials on POST", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    await apiFetch("/api/x", { method: "POST", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Record<string, string>)["X-Requested-With"]).toBe("Donjaicheck");
  });

  it("turns an API error into ApiError with field details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Some fields are invalid", code: "VALIDATION_FAILED", details: [{ field: "title", message: "Required" }] }),
        { status: 400 }
      )
    );
    const err = (await apiFetch("/api/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.fieldError("title")).toBe("Required");
  });
});
