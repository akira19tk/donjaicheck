/** CR-01 UI: correcting my own response (AC-05-08). */
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
  requiresVisitCode: true,
  questions: [
    { id: 1, position: 1, text: "Taste", type: "RATING", required: true, options: [] },
    { id: 2, position: 2, text: "Comments", type: "TEXT", required: false, options: [] },
  ],
};
const own = {
  id: 40,
  survey: { id: 7 },
  canEdit: true,
  answers: [
    { questionId: 1, rating: 2, optionId: null, optionIds: [], text: null },
    { questionId: 2, rating: null, optionId: null, optionIds: [], text: "Too salty" },
  ],
};

describe("Edit my answers (CR-01)", () => {
  it("pre-fills my answers, hides the visit code and sends PUT with the corrected answers", async () => {
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (init?.method === "PUT") return new Response(JSON.stringify({ response: { id: 40, editCount: 1 } }), { status: 200 });
      if (url.includes("/api/responses/40")) return new Response(JSON.stringify({ response: own }), { status: 200 });
      return new Response(JSON.stringify({ survey, responseId: 40 }), { status: 200 });
    });
    render(
      <MemoryRouter initialEntries={["/responses/40/edit"]}>
        <Routes>
          <Route path="/responses/:responseId/edit" element={<AnswerSurveyPage />} />
          <Route path="/responses/:id" element={<p>my answers page</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByLabelText("Comments")).toHaveValue("Too salty");
    expect(screen.queryByLabelText(/visit code/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radiogroup", { name: "Taste" }).querySelector('input[value="5"]')!);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("my answers page")).toBeInTheDocument();
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.url).toContain("/api/responses/40");
    expect(put.body).toEqual({
      answers: [
        { questionId: 1, rating: 5 },
        { questionId: 2, text: "Too salty" },
      ],
    });
  });
});
