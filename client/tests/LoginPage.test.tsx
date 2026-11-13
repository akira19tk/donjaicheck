import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/auth";
import { LoginPage } from "../src/pages/LoginPage";

afterEach(() => vi.restoreAllMocks());

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

describe("LoginPage (F-01 UI)", () => {
  it("shows the API error message when the credentials are wrong", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) return json(401, { error: "Authentication required", code: "UNAUTHENTICATED" });
      return json(401, { error: "Email or password is incorrect", code: "INVALID_CREDENTIALS" });
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    await userEvent.type(await screen.findByLabelText(/email/i), "manager@donjai.test");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong-pass1");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
  });
});
