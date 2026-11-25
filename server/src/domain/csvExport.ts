/**
 * Pure CSV building — F-10 (FR-16, BR-13). Unit-tested in tests/unit/csvExport.test.ts (TEST-U-10).
 */

const NEEDS_QUOTES = /[",\r\n]/;
/** Cells a spreadsheet could run as a formula (BR-13). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 quoting plus formula-injection protection (prefix "'"). */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export interface CsvQuestion {
  position: number;
  text: string;
}

export interface CsvRow {
  id: number;
  submittedAt: Date;
  editedAt: Date | null;
  name: string;
  email: string;
  visitCode: string | null;
  /** One value per question, in question order (null = not answered). */
  values: (string | number | null)[];
}

/** Builds the export: UTF-8 BOM (Excel shows Thai text), header row, one CRLF-terminated line per response. */
export function buildCsv(questions: CsvQuestion[], rows: CsvRow[], opts: { includeVisitCode: boolean }): string {
  const header = [
    "response_id",
    "submitted_at",
    "edited_at",
    "respondent_name",
    "respondent_email",
    ...(opts.includeVisitCode ? ["visit_code"] : []),
    ...questions.map((q) => `Q${q.position} ${q.text}`),
  ];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    const cells: (string | number | null)[] = [
      r.id,
      r.submittedAt.toISOString(),
      r.editedAt ? r.editedAt.toISOString() : null,
      r.name,
      r.email,
      ...(opts.includeVisitCode ? [r.visitCode] : []),
      ...r.values,
    ];
    lines.push(cells.map(escapeCsvCell).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
