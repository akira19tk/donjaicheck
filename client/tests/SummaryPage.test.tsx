import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SummaryPage } from "../src/pages/owner/SummaryPage";

afterEach(() => vi.restoreAllMocks());

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={["/owner/surveys/3/summary"]}>
      <Routes>
        <Route path="/owner/surveys/:id/summary" element={<SummaryPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("SummaryPage (F-06 UI)", () => {
  it("shows the empty state when there are no responses (AC-06-02)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ survey: { id: 3, title: "Dinner", status: "PUBLISHED" }, responseCount: 0, questions: [] }), { status: 200 })
    );
    renderAt();
    expect(await screen.findByText("No responses yet")).toBeInTheDocument();
  });

  it("shows the average and option counts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          survey: { id: 3, title: "Dinner", status: "PUBLISHED" },
          responseCount: 3,
          questions: [
            { questionId: 1, position: 1, text: "Taste", type: "RATING", answered: 3, average: 4.33, distribution: { "1": 0, "2": 0, "3": 0, "4": 2, "5": 1 } },
            { questionId: 2, position: 2, text: "Dish", type: "SINGLE_CHOICE", answered: 3, options: [{ optionId: 9, label: "Pad Thai", count: 2 }] },
          ],
        }),
        { status: 200 }
      )
    );
    renderAt();
    expect(await screen.findByTestId("response-count")).toHaveTextContent("3");
    expect(screen.getByText("4.33")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Pad Thai: 2" })).toBeInTheDocument();
  });
});
