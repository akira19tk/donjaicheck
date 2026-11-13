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
