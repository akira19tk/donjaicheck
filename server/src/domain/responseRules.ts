/**
 * Pure response validation — F-05 BR-03. Unit-tested in tests/unit/responseRules.test.ts (TEST-U-02).
 */
import type { FieldError } from "../lib/errors";
import type { QuestionTypeName } from "./surveyRules";

export const TEXT_MAX = 500;

export interface QuestionForValidation {
  id: number;
  type: QuestionTypeName;
  required: boolean;
  optionIds: number[];
  /** F-09: MULTIPLE_CHOICE limits (BR-12) */
  minSelections?: number | null;
  maxSelections?: number | null;
}

export interface ValidAnswer {
  questionId: number;
  ratingValue?: number;
  optionId?: number;
  textValue?: string;
  /** F-09: selected options of a MULTIPLE_CHOICE answer */
  optionIds?: number[];
}

export type ResponseValidation = { ok: true; answers: ValidAnswer[] } | { ok: false; details: FieldError[] };

const field = (questionId: number | string) => `answers[q:${questionId}]`;

/**
 * Checks every answer against the survey's questions and returns all problems at once.
 * Empty answers to optional questions are dropped (no Answer row is stored).
 */
export function validateResponse(questions: QuestionForValidation[], rawAnswers: unknown): ResponseValidation {
  const details: FieldError[] = [];
  if (!Array.isArray(rawAnswers)) {
    return { ok: false, details: [{ field: "answers", message: "Answers must be a list" }] };
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  const given = new Map<number, Record<string, unknown>>();

  for (const raw of rawAnswers) {
    const a = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const qid = a.questionId;
    if (typeof qid !== "number" || !byId.has(qid)) {
      details.push({ field: field(String(qid)), message: "Unknown question" });
      continue;
    }
    if (given.has(qid)) {
      details.push({ field: field(qid), message: "Duplicate answer" });
      continue;
    }
    given.set(qid, a);
  }

  const answers: ValidAnswer[] = [];
  for (const q of questions) {
    const a = given.get(q.id);
    const f = field(q.id);

    if (q.type === "RATING") {
      const v = a?.rating;
      if (v === undefined || v === null) {
        if (q.required) details.push({ field: f, message: "Required" });
      } else if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
        details.push({ field: f, message: "Rating must be an integer from 1 to 5" });
      } else answers.push({ questionId: q.id, ratingValue: v });
    } else if (q.type === "SINGLE_CHOICE") {
      const v = a?.optionId;
      if (v === undefined || v === null) {
        if (q.required) details.push({ field: f, message: "Required" });
      } else if (typeof v !== "number" || !q.optionIds.includes(v)) {
        details.push({ field: f, message: "Invalid option" });
      } else answers.push({ questionId: q.id, optionId: v });
    } else if (q.type === "MULTIPLE_CHOICE") {
      // F-09 (BR-03 extended, BR-12)
      const v = a?.optionIds;
      const min = q.minSelections ?? (q.required ? 1 : 0);
      const max = q.maxSelections ?? q.optionIds.length;
      if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) {
        if (q.required || min > 0) details.push({ field: f, message: "Required" });
      } else if (!Array.isArray(v) || !v.every((x) => Number.isInteger(x)) || new Set(v).size !== v.length) {
        details.push({ field: f, message: "Invalid selection" });
      } else if (!v.every((x: number) => q.optionIds.includes(x))) {
        details.push({ field: f, message: "Invalid option" });
      } else if (v.length < min) {
        details.push({ field: f, message: `Select at least ${min}` });
      } else if (v.length > max) {
        details.push({ field: f, message: `Select at most ${max}` });
      } else answers.push({ questionId: q.id, optionIds: v as number[] });
    } else {
      const v = a?.text;
      const text = typeof v === "string" ? v.trim() : v;
      if (text === undefined || text === null || text === "") {
        if (q.required) details.push({ field: f, message: "Required" });
      } else if (typeof text !== "string") {
        details.push({ field: f, message: "Answer must be text" });
      } else if (text.length > TEXT_MAX) {
        details.push({ field: f, message: `Text must be at most ${TEXT_MAX} characters` });
      } else answers.push({ questionId: q.id, textValue: text });
    }
  }

  return details.length ? { ok: false, details } : { ok: true, answers };
}
