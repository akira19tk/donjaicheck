/**
 * Pure visit-code rules — F-07 (FR-13, BR-09). Unit-tested in tests/unit/visitCodes.test.ts (TEST-U-07).
 */
import { randomInt } from "crypto";
import type { FieldError } from "../lib/errors";

/** No 0/O or 1/I so codes printed on receipts cannot be misread. */
export const VISIT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VISIT_CODE_LENGTH = 8;
export const MAX_CODES_PER_REQUEST = 50;

/** Random source: returns an integer in [0, max). Defaults to the cryptographic generator. */
export type RandomInt = (max: number) => number;

export function generateVisitCode(rand: RandomInt = randomInt): string {
  let code = "";
  for (let i = 0; i < VISIT_CODE_LENGTH; i++) code += VISIT_CODE_ALPHABET[rand(VISIT_CODE_ALPHABET.length)];
  return code;
}

/** Accepts what a customer types ("ab3k-9qxz", " AB3K 9QXZ ") and returns the stored form, or null. */
export function normalizeVisitCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== VISIT_CODE_LENGTH) return null;
  for (const ch of code) if (!VISIT_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

export function validateCodeCount(n: unknown): { ok: true; value: number } | { ok: false; details: FieldError[] } {
  if (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_CODES_PER_REQUEST) return { ok: true, value: n };
  return { ok: false, details: [{ field: "count", message: `Enter a whole number from 1 to ${MAX_CODES_PER_REQUEST}` }] };
}
