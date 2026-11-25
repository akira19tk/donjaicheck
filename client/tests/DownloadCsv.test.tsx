/** F-10 UI: Download CSV button (AC-10-01, AC-10-05). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DownloadCsvButton } from "../src/pages/owner/SummaryPage";

afterEach(() => vi.restoreAllMocks());

describe("DownloadCsvButton (F-10)", () => {
  it("requests the export with the session cookie and saves it under the server file name", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("﻿response_id\r\n", {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="donjaicheck-survey-3-responses.csv"' },
      })
    );
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<DownloadCsvButton surveyId={3} />);
    await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(fetchSpy).toHaveBeenCalledWith("/api/owner/surveys/3/export.csv", { credentials: "include" });
    expect(click).toHaveBeenCalled();
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe("donjaicheck-survey-3-responses.csv");
  });

  it("shows an error when the survey is not available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));
    render(<DownloadCsvButton surveyId={3} />);
    await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(await screen.findByText("Survey not found.")).toBeInTheDocument();
  });
});
