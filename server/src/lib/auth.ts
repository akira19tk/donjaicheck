import crypto from "crypto";
import bcrypt from "bcryptjs";

/** bcrypt cost from BCRYPT_COST, never below 10 (NFR-01). */
export function bcryptCost(): number {
  const parsed = Number.parseInt(process.env.BCRYPT_COST ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 10 ? parsed : 10;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptCost());
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Trim and lower-case; returns null when the value is not a plausible email. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

/** 256-bit random session token (NFR-03). Only its hash is stored. */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function sessionTtlMs(): number {
  const hours = Number.parseFloat(process.env.SESSION_TTL_HOURS ?? "");
  return (Number.isFinite(hours) && hours > 0 ? hours : 8) * 60 * 60 * 1000;
}
