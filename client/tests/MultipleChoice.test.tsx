/** F-09 UI: multiple-choice checkboxes on the answer form (AC-09-03). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AnswerSurveyPage } from "../src/pages/respondent/AnswerSurveyPage";

afterEach(() => vi.restoreAllMocks());

const survey = {
  id: 11,
  title: "Sides",
  description: "",
  status: "PUBLISHED",
  questions: [
    {
      id: 5,
      position: 1,
      text: "Which sides?",
      type: "MULTIPLE_CHOICE",
      required: true,
      minSelections: 1,
      maxSelections: 2,
      options: [
        { id: 51, position: 1, label: "Rice" },
        { id: 52, position: 2, label: "Salad" },
        { id: 53, position: 3, label: "Soup" },
      ],
    },
  ],
};

describe("Multiple choice (F-09)", () => {
  it("shows the selection hint and sends all ticked options", async () => {
    const posted: { answers: unknown[] }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        posted.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ response: { id: 99 } }), { status: 201 });
      }
      return new Response(JSON.stringify({ survey, responseId: null }), { status: 200 });
    });
    render(
      <MemoryRouter initialEntries={["/surveys/11"]}>
        <Routes>
          <Route path="/surveys/:id" element={<AnswerSurveyPage />} />
          <Route path="/responses/:id" element={<p>done</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Choose 1–2")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Rice"));
    await userEvent.click(screen.getByLabelText("Soup"));
    await userEvent.click(screen.getByLabelText("Rice"));
    await userEvent.click(screen.getByLabelText("Salad"));
    await userEvent.click(screen.getByRole("button", { name: /submit answers/i }));
    expect(await screen.findByText("done")).toBeInTheDocument();
    expect(posted[0].answers).toEqual([{ questionId: 5, optionIds: [53, 52] }]);
  });
});
