/** TEST-U-07 — F-07 visit-code rules (BR-09) */
import { describe, expect, it } from "vitest";
import { VISIT_CODE_ALPHABET, generateVisitCode, normalizeVisitCode, validateCodeCount } from "../../src/domain/visitCodes";

describe("TEST-U-07 generateVisitCode", () => {
  it("creates 8-character codes from the unambiguous alphabet", () => {
    const codes = Array.from({ length: 1000 }, () => generateVisitCode());
    for (const c of codes) {
      expect(c).toHaveLength(8);
      for (const ch of c) expect(VISIT_CODE_ALPHABET).toContain(ch);
    }
    expect(VISIT_CODE_ALPHABET).not.toMatch(/[01OI]/);
    expect(new Set(codes).size).toBeGreaterThan(990); // random, practically no repeats
  });

  it("uses the injected random source (deterministic)", () => {
    expect(generateVisitCode(() => 0)).toBe("AAAAAAAA");
    expect(generateVisitCode((max) => max - 1)).toBe("99999999");
  });
});

describe("TEST-U-07 normalizeVisitCode", () => {
  it.each([
    ["ab3k-9qxz", "AB3K9QXZ"],
    [" AB3K 9QXZ ", "AB3K9QXZ"],
    ["AB3K9QX", null], // 7 characters
    ["AB3K9QX0", null], // 0 is not in the alphabet
    ["", null],
    [12345678, null],
    [undefined, null],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeVisitCode(input)).toBe(expected);
  });
});

describe("TEST-U-07 validateCodeCount", () => {
  it.each([
    [0, false],
    [1, true],
    [50, true],
    [51, false],
    [2.5, false],
    ["5", false],
  ])("%s -> %s", (n, ok) => {
    expect(validateCodeCount(n).ok).toBe(ok);
  });
});
