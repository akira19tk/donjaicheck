/** TEST-U-15 — CR-01 canEditResponse (BR-15) */
import { describe, expect, it } from "vitest";
import { canEditResponse } from "../../src/domain/responseRules";

const NOW = new Date("2026-11-25T07:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;

describe("TEST-U-15 canEditResponse", () => {
  it.each([
    ["29 min 59 s old, no edits, open", ago(30 * MIN - 1000), 0, true, true],
    ["exactly 30 min old", ago(30 * MIN), 0, true, "EDIT_WINDOW_PASSED"],
    ["31 min old", ago(31 * MIN), 0, true, "EDIT_WINDOW_PASSED"],
    ["2 previous edits (third edit)", ago(MIN), 2, true, true],
    ["3 previous edits (fourth edit)", ago(MIN), 3, true, "EDIT_LIMIT_REACHED"],
    ["survey no longer accepting", ago(MIN), 0, false, "SURVEY_NOT_OPEN"],
    ["closed survey is reported before the window", ago(40 * MIN), 3, false, "SURVEY_NOT_OPEN"],
  ] as const)("%s", (_label, submittedAt, editCount, accepting, expected) => {
    const r = canEditResponse({ submittedAt, editCount }, accepting, NOW);
    if (expected === true) {
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.editableUntil.toISOString()).toBe(new Date(submittedAt.getTime() + 30 * MIN).toISOString());
    } else {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe(expected);
    }
  });
});
