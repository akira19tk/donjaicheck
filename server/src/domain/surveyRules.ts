/**
 * Pure survey rules (no database) — F-03 BR-08 validation and F-04 BR-04 transitions.
 * Unit-tested in tests/unit/surveyRules.test.ts (TEST-U-01, TEST-U-03).
 */
import type { FieldError } from "../lib/errors";

export const LIMITS = {
  titleMax: 120,
  descriptionMax: 500,
  questionsMax: 20,
  questionTextMax: 200,
  optionsMin: 2,
  optionsMax: 10,
  optionLabelMax: 60,
} as const;

export const QUESTION_TYPES = ["RATING", "SINGLE_CHOICE", "TEXT"] as const;
export type QuestionTypeName = (typeof QUESTION_TYPES)[number];
export type SurveyStatusName = "DRAFT" | "PUBLISHED" | "CLOSED";
export type LifecycleAction = "publish" | "close";

export interface SurveyInput {
  title: string;
  description: string;
  questions: { text: string; type: QuestionTypeName; required: boolean; options: string[] }[];
}

export type ValidationResult = { ok: true; value: SurveyInput } | { ok: false; details: FieldError[] };

const isString = (v: unknown): v is string => typeof v === "string";

/** BR-08: validates and normalises a create/edit request body. Returns every problem at once. */
export function validateSurveyInput(body: unknown): ValidationResult {
  const details: FieldError[] = [];
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const title = isString(b.title) ? b.title.trim() : "";
  if (!title) details.push({ field: "title", message: "Title is required" });
  else if (title.length > LIMITS.titleMax)
    details.push({ field: "title", message: `Title must be at most ${LIMITS.titleMax} characters` });

  let description = "";
  if (b.description !== undefined && b.description !== null) {
    if (!isString(b.description)) details.push({ field: "description", message: "Description must be text" });
    else {
      description = b.description.trim();
      if (description.length > LIMITS.descriptionMax)
        details.push({ field: "description", message: `Description must be at most ${LIMITS.descriptionMax} characters` });
    }
  }

  const rawQuestions = b.questions === undefined ? [] : b.questions;
  const questions: SurveyInput["questions"] = [];
  if (!Array.isArray(rawQuestions)) {
    details.push({ field: "questions", message: "Questions must be a list" });
  } else if (rawQuestions.length > LIMITS.questionsMax) {
    details.push({ field: "questions", message: `A survey can have at most ${LIMITS.questionsMax} questions` });
  } else {
    rawQuestions.forEach((raw, i) => {
      const q = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      const f = (name: string) => `questions[${i}].${name}`;

      const text = isString(q.text) ? q.text.trim() : "";
      if (!text) details.push({ field: f("text"), message: "Question text is required" });
      else if (text.length > LIMITS.questionTextMax)
        details.push({ field: f("text"), message: `Question text must be at most ${LIMITS.questionTextMax} characters` });

      const type = q.type as QuestionTypeName;
      if (!QUESTION_TYPES.includes(type)) {
        details.push({ field: f("type"), message: "Type must be RATING, SINGLE_CHOICE or TEXT" });
      }

      if (q.required !== undefined && typeof q.required !== "boolean") {
        details.push({ field: f("required"), message: "Required must be true or false" });
      }

      const rawOptions = q.options === undefined || q.options === null ? [] : q.options;
      let options: string[] = [];
      if (!Array.isArray(rawOptions) || !rawOptions.every(isString)) {
        details.push({ field: f("options"), message: "Options must be a list of text" });
      } else {
        options = rawOptions.map((o) => o.trim());
        if (type === "SINGLE_CHOICE") {
          if (options.length < LIMITS.optionsMin || options.length > LIMITS.optionsMax) {
            details.push({ field: f("options"), message: `Single choice needs ${LIMITS.optionsMin}-${LIMITS.optionsMax} options` });
          } else if (options.some((o) => !o)) {
            details.push({ field: f("options"), message: "Options cannot be empty" });
          } else if (options.some((o) => o.length > LIMITS.optionLabelMax)) {
            details.push({ field: f("options"), message: `Options must be at most ${LIMITS.optionLabelMax} characters` });
          } else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
            details.push({ field: f("options"), message: "Options must be unique" });
          }
        } else if (QUESTION_TYPES.includes(type) && options.length > 0) {
          details.push({ field: f("options"), message: "Only single choice questions have options" });
        }
      }

      questions.push({ text, type, required: q.required === undefined ? true : q.required === true, options });
    });
  }

  return details.length ? { ok: false, details } : { ok: true, value: { title, description, questions } };
}

/** BR-04: DRAFT -> PUBLISHED (publish) and PUBLISHED -> CLOSED (close) are the only transitions. */
export function canTransition(from: SurveyStatusName, action: LifecycleAction): boolean {
  return (from === "DRAFT" && action === "publish") || (from === "PUBLISHED" && action === "close");
}
