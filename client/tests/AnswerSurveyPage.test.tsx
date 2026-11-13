import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AnswerSurveyPage } from "../src/pages/respondent/AnswerSurveyPage";

afterEach(() => vi.restoreAllMocks());

const survey = {
  id: 7,
  title: "Dinner experience",
  description: "",
  status: "PUBLISHED",
  questions: [
    { id: 1, position: 1, text: "Taste", type: "RATING", required: true, options: [] },
    { id: 2, position: 2, text: "Comments", type: "TEXT", required: false, options: [] },
  ],
};

describe("AnswerSurveyPage (AC-05-06)", () => {
  it("shows the error under the missing required question and keeps the other answers", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({ error: "Some fields are invalid", code: "VALIDATION_FAILED", details: [{ field: "answers[q:1]", message: "Required" }] }),
          { status: 400 }
        );
      }
      return new Response(JSON.stringify({ survey, responseId: null }), { status: 200 });
    });
    render(
      <MemoryRouter initialEntries={["/surveys/7"]}>
        <Routes>
          <Route path="/surveys/:id" element={<AnswerSurveyPage />} />
        </Routes>
      </MemoryRouter>
    );
    const comments = await screen.findByLabelText("Comments");
    await userEvent.type(comments, "Nice staff");
    await userEvent.click(screen.getByRole("button", { name: /submit answers/i }));
    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/highlighted questions/i);
    expect(screen.getByLabelText("Comments")).toHaveValue("Nice staff");
  });

  it("shows a closed message instead of the form for a CLOSED survey", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ survey: { ...survey, status: "CLOSED" }, responseId: null }), { status: 200 })
    );
    render(
      <MemoryRouter initialEntries={["/surveys/7"]}>
        <Routes>
          <Route path="/surveys/:id" element={<AnswerSurveyPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/closed and no longer accepts responses/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});
