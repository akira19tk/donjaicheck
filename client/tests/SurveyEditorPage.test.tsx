import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SurveyEditorPage } from "../src/pages/owner/SurveyEditorPage";

afterEach(() => vi.restoreAllMocks());

describe("SurveyEditorPage (F-03 UI, NFR-06)", () => {
  it("shows the API field errors next to the fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Some fields are invalid",
          code: "VALIDATION_FAILED",
          details: [
            { field: "title", message: "Title is required" },
            { field: "questions[0].text", message: "Question text is required" },
          ],
        }),
        { status: 400 }
      )
    );
    render(
      <MemoryRouter initialEntries={["/owner/surveys/new"]}>
        <Routes>
          <Route path="/owner/surveys/new" element={<SurveyEditorPage />} />
        </Routes>
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Question text is required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/fix the highlighted fields/i);
  });

  it("adds option rows for a single choice question", async () => {
    render(
      <MemoryRouter initialEntries={["/owner/surveys/new"]}>
        <Routes>
          <Route path="/owner/surveys/new" element={<SurveyEditorPage />} />
        </Routes>
      </MemoryRouter>
    );
    await userEvent.selectOptions(screen.getByLabelText("Type"), "SINGLE_CHOICE");
    expect(screen.getAllByLabelText(/Question 1 option/)).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /add option/i }));
    expect(screen.getAllByLabelText(/Question 1 option/)).toHaveLength(3);
  });
});
