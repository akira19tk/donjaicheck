/** TEST-U-13 — F-13 duplicate input (BR-14) */
import { describe, expect, it } from "vitest";
import { buildDuplicateInput } from "../../src/domain/duplicate";

const source = {
  title: "T".repeat(118),
  description: "Weekly lunch survey",
  requiresVisitCode: true,
  closesAt: new Date("2026-12-01T00:00:00Z"),
  questions: [
    { position: 2, text: "Sides", type: "MULTIPLE_CHOICE" as const, required: true, minSelections: 1, maxSelections: 2, options: [
      { position: 2, label: "B" },
      { position: 1, label: "A" },
      { position: 3, label: "C" },
    ] },
    { position: 1, text: "Taste", type: "RATING" as const, required: true, minSelections: null, maxSelections: null, options: [] },
    { position: 3, text: "Comments", type: "TEXT" as const, required: false, minSelections: null, maxSelections: null, options: [] },
  ],
};

describe("TEST-U-13 buildDuplicateInput", () => {
  const copy = buildDuplicateInput(source);

  it("prefixes the title and cuts it to 120 characters", () => {
    expect(copy.title).toBe(("Copy of " + "T".repeat(118)).slice(0, 120));
    expect(copy.title).toHaveLength(120);
  });

  it("copies description, visit-code setting and questions/options in position order", () => {
    expect(copy.description).toBe("Weekly lunch survey");
    expect(copy.requiresVisitCode).toBe(true);
    expect(copy.questions.map((q) => q.text)).toEqual(["Taste", "Sides", "Comments"]);
    expect(copy.questions[1]).toEqual({
      text: "Sides",
      type: "MULTIPLE_CHOICE",
      required: true,
      minSelections: 1,
      maxSelections: 2,
      options: ["A", "B", "C"],
    });
    expect(copy.questions[2]).toMatchObject({ required: false, minSelections: null, maxSelections: null });
  });

  it("never copies the schedule (BR-14)", () => {
    expect(copy).not.toHaveProperty("closesAt");
  });

  it("keeps short titles whole", () => {
    expect(buildDuplicateInput({ ...source, title: "Lunch" }).title).toBe("Copy of Lunch");
  });
});
