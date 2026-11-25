/** TEST-U-01 (BR-04 transitions) and TEST-U-03 (BR-08 boundaries) */
import { describe, expect, it } from "vitest";
import { canTransition, validateSurveyInput } from "../../src/domain/surveyRules";

const q = (overrides: Record<string, unknown> = {}) => ({ text: "Q", type: "RATING", required: true, ...overrides });
const fields = (body: unknown) => {
  const r = validateSurveyInput(body);
  return r.ok ? [] : r.details.map((d) => d.field);
};

describe("TEST-U-01 canTransition (BR-04)", () => {
  it.each([
    ["DRAFT", "publish", true],
    ["DRAFT", "close", false],
    ["PUBLISHED", "publish", false],
    ["PUBLISHED", "close", true],
    ["CLOSED", "publish", false],
    ["CLOSED", "close", false],
  ] as const)("%s + %s -> %s", (from, action, expected) => {
    expect(canTransition(from, action)).toBe(expected);
  });
});

describe("TEST-U-03 validateSurveyInput (BR-08)", () => {
  it("accepts a title of exactly 120 characters and rejects 121", () => {
    expect(fields({ title: "a".repeat(120), questions: [q()] })).toEqual([]);
    expect(fields({ title: "a".repeat(121), questions: [q()] })).toEqual(["title"]);
  });

  it("rejects an empty or whitespace title", () => {
    expect(fields({ title: "   ", questions: [] })).toEqual(["title"]);
  });

  it("accepts 0 and 20 questions and rejects 21", () => {
    expect(fields({ title: "T", questions: [] })).toEqual([]);
    expect(fields({ title: "T", questions: Array.from({ length: 20 }, () => q()) })).toEqual([]);
    expect(fields({ title: "T", questions: Array.from({ length: 21 }, () => q()) })).toEqual(["questions"]);
  });

  it("single choice accepts 2 and 10 options and rejects 1 and 11", () => {
    const sc = (n: number) => q({ type: "SINGLE_CHOICE", options: Array.from({ length: n }, (_, i) => `o${i}`) });
    expect(fields({ title: "T", questions: [sc(2)] })).toEqual([]);
    expect(fields({ title: "T", questions: [sc(10)] })).toEqual([]);
    expect(fields({ title: "T", questions: [sc(1)] })).toEqual(["questions[0].options"]);
    expect(fields({ title: "T", questions: [sc(11)] })).toEqual(["questions[0].options"]);
  });

  it("rejects duplicate (case-insensitive) and empty option labels", () => {
    expect(fields({ title: "T", questions: [q({ type: "SINGLE_CHOICE", options: ["Yes", "yes"] })] })).toEqual(["questions[0].options"]);
    expect(fields({ title: "T", questions: [q({ type: "SINGLE_CHOICE", options: ["Yes", " "] })] })).toEqual(["questions[0].options"]);
  });

  it("rejects options on rating and text questions, unknown types and empty question text", () => {
    expect(fields({ title: "T", questions: [q({ options: ["a", "b"] })] })).toEqual(["questions[0].options"]);
    expect(fields({ title: "T", questions: [q({ type: "SCALE" })] })).toEqual(["questions[0].type"]);
    expect(fields({ title: "T", questions: [q({ text: "" })] })).toEqual(["questions[0].text"]);
  });

  it("question text boundary 200/201", () => {
    expect(fields({ title: "T", questions: [q({ text: "a".repeat(200) })] })).toEqual([]);
    expect(fields({ title: "T", questions: [q({ text: "a".repeat(201) })] })).toEqual(["questions[0].text"]);
  });

  it("trims values and defaults required to true", () => {
    const r = validateSurveyInput({ title: "  Lunch  ", questions: [{ text: " Taste ", type: "RATING" }] });
    expect(r.ok && r.value).toEqual({
      title: "Lunch",
      description: "",
      questions: [{ text: "Taste", type: "RATING", required: true, options: [] }],
    });
  });
});

/** TEST-U-09a — F-09 MULTIPLE_CHOICE definition rules (BR-12) */
describe("TEST-U-09a multiple-choice definitions (BR-12)", () => {
  const mc = (n: number, extra: Record<string, unknown> = {}) =>
    q({ type: "MULTIPLE_CHOICE", options: Array.from({ length: n }, (_, i) => `Opt ${i + 1}`), ...extra });

  it("accepts 2 and 10 options and rejects 1 and 11", () => {
    expect(fields({ title: "T", questions: [mc(2)] })).toEqual([]);
    expect(fields({ title: "T", questions: [mc(10)] })).toEqual([]);
    expect(fields({ title: "T", questions: [mc(1)] })).toEqual(["questions[0].options"]);
    expect(fields({ title: "T", questions: [mc(11)] })).toEqual(["questions[0].options"]);
  });

  it("rejects duplicate labels", () => {
    expect(fields({ title: "T", questions: [q({ type: "MULTIPLE_CHOICE", options: ["Rice", "rice"] })] })).toEqual([
      "questions[0].options",
    ]);
  });

  it("checks min/max selections", () => {
    expect(fields({ title: "T", questions: [mc(4, { minSelections: 1, maxSelections: 4 })] })).toEqual([]);
    expect(fields({ title: "T", questions: [mc(4, { minSelections: 3, maxSelections: 2 })] })).toEqual(["questions[0].minSelections"]);
    expect(fields({ title: "T", questions: [mc(4, { maxSelections: 5 })] })).toEqual(["questions[0].maxSelections"]);
    expect(fields({ title: "T", questions: [mc(4, { maxSelections: 0 })] })).toEqual(["questions[0].maxSelections"]);
    expect(fields({ title: "T", questions: [mc(4, { minSelections: 1.5 })] })).toEqual(["questions[0].minSelections"]);
    expect(fields({ title: "T", questions: [mc(4, { required: true, minSelections: 0 })] })).toEqual(["questions[0].minSelections"]);
    expect(fields({ title: "T", questions: [mc(4, { required: false, minSelections: 0 })] })).toEqual([]);
  });

  it("applies defaults: min 1 when required (0 when optional), max = number of options", () => {
    const r = validateSurveyInput({ title: "T", questions: [mc(4), mc(3, { required: false })] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.questions[0]).toMatchObject({ minSelections: 1, maxSelections: 4 });
    expect(r.value.questions[1]).toMatchObject({ minSelections: 0, maxSelections: 3 });
  });
});
