/**
 * Pure aggregate computation — F-06 (FR-12). Unit-tested in tests/unit/summary.test.ts.
 * Text answers are returned without respondent identity (decision D-03).
 */
import type { QuestionTypeName } from "./surveyRules";

export interface SummaryQuestion {
  id: number;
  position: number;
  text: string;
  type: QuestionTypeName;
  options: { id: number; label: string }[];
}

export interface SummaryAnswer {
  questionId: number;
  ratingValue: number | null;
  optionId: number | null;
  textValue: string | null;
  submittedAt: Date;
}

export function buildSummary(questions: SummaryQuestion[], answers: SummaryAnswer[]) {
  return questions.map((q) => {
    const mine = answers.filter((a) => a.questionId === q.id);
    const base = { questionId: q.id, position: q.position, text: q.text, type: q.type };

    if (q.type === "RATING") {
      const values = mine.map((a) => a.ratingValue).filter((v): v is number => v !== null);
      const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      for (const v of values) distribution[String(v)] += 1;
      const average = values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100 : null;
      return { ...base, answered: values.length, average, distribution };
    }

    if (q.type === "SINGLE_CHOICE") {
      const chosen = mine.filter((a) => a.optionId !== null);
      return {
        ...base,
        answered: chosen.length,
        options: q.options.map((o) => ({ optionId: o.id, label: o.label, count: chosen.filter((a) => a.optionId === o.id).length })),
      };
    }

    const texts = mine
      .filter((a) => a.textValue !== null && a.textValue !== "")
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .map((a) => a.textValue as string);
    return { ...base, answered: texts.length, texts };
  });
}
