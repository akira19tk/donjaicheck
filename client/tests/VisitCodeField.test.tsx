/** F-07 UI: visit code field on the answer form (AC-07-03, AC-07-05). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AnswerSurveyPage } from "../src/pages/respondent/AnswerSurveyPage";

afterEach(() => vi.restoreAllMocks());

const survey = {
  id: 9,
  title: "Receipt survey",
  description: "",
  status: "PUBLISHED",
  requiresVisitCode: true,
  closesAt: null,
  questions: [{ id: 1, position: 1, text: "Comments", type: "TEXT", required: false, options: [] }],
};

describe("Visit code field (F-07)", () => {
  it("sends the typed code and shows a used-code error next to the field", async () => {
    const posted: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        posted.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ error: "This visit code has already been used", code: "VISIT_CODE_USED" }), { status: 409 });
      }
      return new Response(JSON.stringify({ survey, responseId: null }), { status: 200 });
    });
    render(
      <MemoryRouter initialEntries={["/surveys/9"]}>
        <Routes>
          <Route path="/surveys/:id" element={<AnswerSurveyPage />} />
        </Routes>
      </MemoryRouter>
    );
    const field = await screen.findByLabelText(/visit code/i);
    await userEvent.type(field, "ab3k-9qxz");
    await userEvent.click(screen.getByRole("button", { name: /submit answers/i }));
    expect(await screen.findAllByText("This visit code has already been used")).not.toHaveLength(0);
    expect(posted[0]).toMatchObject({ visitCode: "ab3k-9qxz" });
    expect(screen.getByLabelText(/visit code/i)).toHaveValue("ab3k-9qxz");
  });
});
