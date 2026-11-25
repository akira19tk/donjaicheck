/** TEST-U-10 — F-10 CSV cell escaping and layout (BR-13) */
import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvCell } from "../../src/domain/csvExport";

describe("TEST-U-10 escapeCsvCell", () => {
  it.each([
    ["normal", "normal"],
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["line1\nline2", '"line1\nline2"'],
    ["=SUM(A1)", "'=SUM(A1)"],
    ["+1", "'+1"],
    ["-2", "'-2"],
    ["@x", "'@x"],
    ['=HYPERLINK("x")', `"'=HYPERLINK(""x"")"`],
    [null, ""],
    [undefined, ""],
    [4, "4"],
  ])("%s", (value, expected) => {
    expect(escapeCsvCell(value)).toBe(expected);
  });
});

describe("TEST-U-10 buildCsv", () => {
  const questions = [
    { position: 1, text: "Taste, overall" },
    { position: 2, text: "Sides" },
  ];
  it("starts with a BOM, uses CRLF, quotes headers and keeps row order", () => {
    const csv = buildCsv(
      questions,
      [
        { id: 1, submittedAt: new Date("2026-11-25T01:00:00Z"), editedAt: null, name: "Ann", email: "ann@x.test", visitCode: null, values: [5, "A; B"] },
        { id: 2, submittedAt: new Date("2026-11-25T02:00:00Z"), editedAt: new Date("2026-11-25T02:10:00Z"), name: "Ben", email: "ben@x.test", visitCode: null, values: [3, null] },
      ],
      { includeVisitCode: false }
    );
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe('response_id,submitted_at,edited_at,respondent_name,respondent_email,"Q1 Taste, overall",Q2 Sides');
    expect(lines[1]).toBe("1,2026-11-25T01:00:00.000Z,,Ann,ann@x.test,5,A; B");
    expect(lines[2]).toBe("2,2026-11-25T02:00:00.000Z,2026-11-25T02:10:00.000Z,Ben,ben@x.test,3,");
    expect(lines).toHaveLength(4); // trailing CRLF
  });

  it("adds the visit_code column only when requested", () => {
    const csv = buildCsv(questions, [], { includeVisitCode: true });
    expect(csv.slice(1).split("\r\n")[0]).toContain("respondent_email,visit_code,");
  });
});
