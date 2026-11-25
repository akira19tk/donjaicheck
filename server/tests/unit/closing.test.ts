/** TEST-U-08 — F-08 scheduled closing rules (BR-11) */
import { describe, expect, it } from "vitest";
import { isAcceptingResponses, validateClosesAt } from "../../src/domain/closing";

const NOW = new Date("2026-11-24T05:00:00.000Z");
const plus = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe("TEST-U-08 validateClosesAt", () => {
  it.each([
    ["null clears the schedule", null, true],
    ["absent clears the schedule", undefined, true],
    ["not a date", "abc", false],
    ["a number is not accepted", 1767225600000, false],
    ["exactly now is not in the future", NOW.toISOString(), false],
    ["one minute in the past", plus(-MIN), false],
    ["one minute in the future", plus(MIN), true],
    ["366 days ahead (limit)", plus(366 * DAY), true],
    ["367 days ahead", plus(367 * DAY), false],
  ])("%s", (_label, value, ok) => {
    const r = validateClosesAt(value, NOW);
    expect(r.ok).toBe(ok);
    if (!r.ok) expect(r.details[0].field).toBe("closesAt");
  });

  it("returns a Date for a valid value and null for null", () => {
    const r = validateClosesAt(plus(MIN), NOW);
    expect(r.ok && r.value?.toISOString()).toBe(plus(MIN));
    const n = validateClosesAt(null, NOW);
    expect(n.ok && n.value).toBeNull();
  });
});

describe("TEST-U-08 isAcceptingResponses", () => {
  it.each([
    ["PUBLISHED", null, true],
    ["PUBLISHED", new Date(NOW.getTime() + MIN), true],
    ["PUBLISHED", new Date(NOW.getTime() - 1), false],
    ["PUBLISHED", NOW, false],
    ["DRAFT", null, false],
    ["CLOSED", null, false],
    ["CLOSED", new Date(NOW.getTime() + MIN), false],
  ] as const)("%s with closesAt %s -> %s", (status, closesAt, expected) => {
    expect(isAcceptingResponses(status, closesAt, NOW)).toBe(expected);
  });
});
