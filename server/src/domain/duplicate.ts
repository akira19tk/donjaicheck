/**
 * Pure duplication rule — F-13 (FR-19, BR-14). Unit-tested in tests/unit/duplicate.test.ts (TEST-U-13).
 */
import type { QuestionTypeName } from "./surveyRules";
import { LIMITS } from "./surveyRules";

interface SourceSurvey {
  title: string;
  description: string;
  requiresVisitCode: boolean;
  questions: {
    position: number;
    text: string;
    type: QuestionTypeName;
    required: boolean;
    minSelections: number | null;
    maxSelections: number | null;
    options: { position: number; label: string }[];
  }[];
}

/**
 * BR-14: copy title ("Copy of …", cut to the title limit), description, visit-code setting and every question
 * with its options in position order. Never responses, visit codes or schedule (closesAt / publishedAt / closedAt).
 */
export function buildDuplicateInput(s: SourceSurvey) {
  return {
    title: `Copy of ${s.title}`.slice(0, LIMITS.titleMax),
    description: s.description,
    requiresVisitCode: s.requiresVisitCode,
    questions: [...s.questions]
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        text: q.text,
        type: q.type,
        required: q.required,
        minSelections: q.minSelections,
        maxSelections: q.maxSelections,
        options: [...q.options].sort((a, b) => a.position - b.position).map((o) => o.label),
      })),
  };
}
