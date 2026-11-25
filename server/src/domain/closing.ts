/**
 * Pure scheduled-closing rules — F-08 (FR-14, BR-11).
 * Unit-tested in tests/unit/closing.test.ts (TEST-U-08).
 */
import type { FieldError } from "../lib/errors";
import type { SurveyStatusName } from "./surveyRules";

export const MAX_CLOSING_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ClosesAtResult = { ok: true; value: Date | null } | { ok: false; details: FieldError[] };

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

/** BR-11: null/absent clears the schedule; a value must be a future ISO date-time within one year. */
export function validateClosesAt(raw: unknown, now: Date): ClosesAtResult {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  const fail = (message: string): ClosesAtResult => ({ ok: false, details: [{ field: "closesAt", message }] });
  if (typeof raw !== "string" || !ISO_DATE_TIME.test(raw)) return fail("Must be a date and time");
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) return fail("Must be a date and time");
  if (value.getTime() <= now.getTime()) return fail("Must be in the future");
  if (value.getTime() > now.getTime() + MAX_CLOSING_DAYS * DAY_MS) return fail("Must be within one year");
  return { ok: true, value };
}

/** A survey accepts responses only while PUBLISHED and before its closing time (BR-02, BR-11). */
export function isAcceptingResponses(status: SurveyStatusName, closesAt: Date | null, now: Date): boolean {
  return status === "PUBLISHED" && (closesAt === null || closesAt.getTime() > now.getTime());
}
