/** TEST-U-02 validateResponse (BR-03) */
import { describe, expect, it } from "vitest";
import { validateResponse, type QuestionForValidation } from "../../src/domain/responseRules";

const questions: QuestionForValidation[] = [
  { id: 1, type: "RATING", required: true, optionIds: [] },
  { id: 2, type: "SINGLE_CHOICE", required: true, optionIds: [10, 11] },
  { id: 3, type: "TEXT", required: false, optionIds: [] },
];
const valid = () => [
  { questionId: 1, rating: 5 },
  { questionId: 2, optionId: 10 },
  { questionId: 3, text: "Great!" },
];
const problems = (answers: unknown) => {
  const r = validateResponse(questions, answers);
  return r.ok ? [] : r.details.map((d) => `${d.field}: ${d.message}`);
};

describe("TEST-U-02 validateResponse", () => {
  it("accepts a complete valid response and returns the values to store", () => {
    const r = validateResponse(questions, valid());
    expect(r).toEqual({
      ok: true,
      answers: [
        { questionId: 1, ratingValue: 5 },
        { questionId: 2, optionId: 10 },
        { questionId: 3, textValue: "Great!" },
      ],
    });
  });

  it.each([1, 5])("accepts rating boundary %i", (rating) => {
    expect(problems([{ questionId: 1, rating }, { questionId: 2, optionId: 11 }])).toEqual([]);
  });

  it.each([0, 6, 3.5, "4"])("rejects rating %s", (rating) => {
    expect(problems([{ questionId: 1, rating }, { questionId: 2, optionId: 11 }])).toEqual([
      "answers[q:1]: Rating must be an integer from 1 to 5",
    ]);
  });

  it("rejects an option that belongs to another question", () => {
    expect(problems([{ questionId: 1, rating: 3 }, { questionId: 2, optionId: 99 }])).toEqual(["answers[q:2]: Invalid option"]);
  });

  it("text boundary: 500 characters ok, 501 rejected", () => {
    const base = [{ questionId: 1, rating: 3 }, { questionId: 2, optionId: 10 }];
    expect(problems([...base, { questionId: 3, text: "a".repeat(500) }])).toEqual([]);
    expect(problems([...base, { questionId: 3, text: "a".repeat(501) }])).toEqual(["answers[q:3]: Text must be at most 500 characters"]);
  });

  it("reports missing required answers and allows an empty optional answer", () => {
    expect(problems([{ questionId: 3, text: "  " }])).toEqual(["answers[q:1]: Required", "answers[q:2]: Required"]);
    const r = validateResponse(questions, [{ questionId: 1, rating: 2 }, { questionId: 2, optionId: 10 }]);
    expect(r.ok && r.answers).toHaveLength(2);
  });

  it("rejects unknown questions and duplicate answers", () => {
    expect(problems([...valid(), { questionId: 42, rating: 1 }])).toEqual(["answers[q:42]: Unknown question"]);
    expect(problems([...valid(), { questionId: 1, rating: 4 }])).toEqual(["answers[q:1]: Duplicate answer"]);
  });

  it("rejects a body without an answers list", () => {
    expect(problems(undefined)).toEqual(["answers: Answers must be a list"]);
  });
});
