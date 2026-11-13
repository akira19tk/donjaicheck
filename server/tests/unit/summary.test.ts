/** F-06 buildSummary — pure aggregation (supports TEST-06-01 / TEST-06-02) */
import { describe, expect, it } from "vitest";
import { buildSummary, type SummaryQuestion } from "../../src/domain/summary";

const questions: SummaryQuestion[] = [
  { id: 1, position: 1, text: "Taste", type: "RATING", options: [] },
  { id: 2, position: 2, text: "Dish", type: "SINGLE_CHOICE", options: [{ id: 10, label: "X" }, { id: 11, label: "Y" }, { id: 12, label: "Z" }] },
  { id: 3, position: 3, text: "Comments", type: "TEXT", options: [] },
];
const at = (min: number) => new Date(Date.UTC(2026, 10, 14, 12, min));
const a = (questionId: number, v: Partial<{ ratingValue: number; optionId: number; textValue: string }>, min = 0) => ({
  questionId,
  ratingValue: v.ratingValue ?? null,
  optionId: v.optionId ?? null,
  textValue: v.textValue ?? null,
  submittedAt: at(min),
});

describe("buildSummary", () => {
  it("computes average (2 decimals), distribution, option counts and newest-first texts", () => {
    const result = buildSummary(questions, [
      a(1, { ratingValue: 5 }), a(1, { ratingValue: 4 }), a(1, { ratingValue: 4 }),
      a(2, { optionId: 10 }), a(2, { optionId: 10 }), a(2, { optionId: 11 }),
      a(3, { textValue: "older" }, 1), a(3, { textValue: "newer" }, 5),
    ]);
    expect(result[0]).toMatchObject({ answered: 3, average: 4.33, distribution: { "1": 0, "2": 0, "3": 0, "4": 2, "5": 1 } });
    expect(result[1]).toMatchObject({
      answered: 3,
      options: [{ optionId: 10, label: "X", count: 2 }, { optionId: 11, label: "Y", count: 1 }, { optionId: 12, label: "Z", count: 0 }],
    });
    expect(result[2]).toMatchObject({ answered: 2, texts: ["newer", "older"] });
  });

  it("returns zero counts and a null average when there are no answers", () => {
    const result = buildSummary(questions, []);
    expect(result[0]).toMatchObject({ answered: 0, average: null, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } });
    expect(result[1]).toMatchObject({ answered: 0, options: [{ count: 0 }, { count: 0 }, { count: 0 }] });
    expect(result[2]).toMatchObject({ answered: 0, texts: [] });
  });
});
