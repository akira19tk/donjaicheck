export type SurveyStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type QuestionType = "RATING" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT";

/** Question types that have options. */
export const isChoiceType = (t: QuestionType) => t === "SINGLE_CHOICE" || t === "MULTIPLE_CHOICE";

export interface Option {
  id: number;
  position: number;
  label: string;
}

export interface Question {
  id: number;
  position: number;
  text: string;
  type: QuestionType;
  required: boolean;
  /** F-09: only for MULTIPLE_CHOICE */
  minSelections?: number | null;
  maxSelections?: number | null;
  options: Option[];
}

export interface SurveyDetail {
  id: number;
  title: string;
  description: string;
  status: SurveyStatus;
  createdAt: string;
  publishedAt: string | null;
  closedAt: string | null;
  closesAt: string | null;
  requiresVisitCode: boolean;
  visitCodeCount: number;
  usedVisitCodeCount: number;
  responseCount: number;
  questions: Question[];
}

export interface SurveyListItem {
  id: number;
  title: string;
  status: SurveyStatus;
  responseCount: number;
  createdAt: string;
  publishedAt: string | null;
  closedAt: string | null;
  closesAt: string | null;
}

export const TYPE_LABEL: Record<QuestionType, string> = {
  RATING: "Rating 1–5",
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TEXT: "Short text",
};

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

/** ISO (UTC) -> value for <input type="datetime-local"> in the browser's local time zone. */
export const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** <input type="datetime-local"> value (local time) -> ISO string, or null when empty. */
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export interface VisitCodeItem {
  code: string;
  createdAt: string;
  usedAt: string | null;
}

/** Shows a stored code as "AB3K-9QXZ" (easier to read on a receipt). */
export const formatVisitCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
