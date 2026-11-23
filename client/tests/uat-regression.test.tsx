/**
 * Lab 6 UAT regression tests (finding reported by the UAT team).
 * Must fail (RED) on the release under test (uat-s1) and pass (GREEN) after the fix.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SurveyEditorPage } from "../src/pages/owner/SurveyEditorPage";

afterEach(() => vi.restoreAllMocks());

const renderEditAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/owner/surveys/:id/edit" element={<SurveyEditorPage />} />
      </Routes>
    </MemoryRouter>
  );

const mockGet = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

const survey = (status: "DRAFT" | "PUBLISHED") => ({
  survey: {
    id: 6,
    title: "Lunch survey",
    description: "",
    status,
    createdAt: "2026-11-23T11:37:00.000Z",
    publishedAt: status === "PUBLISHED" ? "2026-11-23T11:38:00.000Z" : null,
    closedAt: null,
    responseCount: 0,
    questions: [{ id: 1, text: "How was the food?", type: "RATING", required: true, position: 1, options: [] }],
  },
});

describe("Lab 6 UAT findings", () => {
  it("UAT-36 (BR-06, AC-02-03): another owner's survey edit URL shows only 'Survey not found.' and no editable form", async () => {
    mockGet(404, { error: "Not found", code: "NOT_FOUND" });
    renderEditAt("/owner/surveys/6/edit");
    expect(await screen.findByText("Survey not found.")).toBeInTheDocument();
    expect(screen.queryByText("Not found")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("UAT-36 (BR-02): a published survey's edit URL shows only 'Only draft surveys can be edited.' and no editable form", async () => {
    mockGet(200, survey("PUBLISHED"));
    renderEditAt("/owner/surveys/6/edit");
    expect(await screen.findByText("Only draft surveys can be edited.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("control: the owner's own draft still opens in the editor with its content", async () => {
    mockGet(200, survey("DRAFT"));
    renderEditAt("/owner/surveys/6/edit");
    expect(await screen.findByDisplayValue("Lunch survey")).toBeInTheDocument();
    expect(screen.getByDisplayValue("How was the food?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeEnabled();
  });
});
