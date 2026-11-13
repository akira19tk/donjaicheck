export type SurveyStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type QuestionType = "RATING" | "SINGLE_CHOICE" | "TEXT";

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
}

export const TYPE_LABEL: Record<QuestionType, string> = {
  RATING: "Rating 1–5",
  SINGLE_CHOICE: "Single choice",
  TEXT: "Short text",
};

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
