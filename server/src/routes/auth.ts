import { Router } from "express";
import { prisma } from "../prisma";
import {
  generateSessionToken,
  hashSessionToken,
  normalizeEmail,
  sessionTtlMs,
  verifyPassword,
} from "../lib/auth";
import { AppError, validationFailed, type FieldError } from "../lib/errors";
import { requireAuth, SESSION_COOKIE } from "../middleware/auth";

export const authRouter = Router();

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");

// F-01 FR-01: POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  const { email: rawEmail, password } = req.body ?? {};
  const details: FieldError[] = [];
  if (typeof rawEmail !== "string" || rawEmail.trim() === "") {
    details.push({ field: "email", message: "Email is required" });
  }
  if (typeof password !== "string" || password === "") {
    details.push({ field: "password", message: "Password is required" });
  }
  if (details.length) throw validationFailed(details);

  const email = normalizeEmail(rawEmail);
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  // Same response for unknown email and wrong password (AC-01-03).
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw invalidCredentials();
  }

  const token = generateSessionToken();
  const ttl = sessionTtlMs();
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + ttl),
    },
  });

  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: ttl });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// F-01 FR-02: POST /api/auth/logout
authRouter.post("/logout", requireAuth, async (req, res) => {
  await prisma.session.deleteMany({ where: { tokenHash: req.sessionTokenHash } });
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.status(204).end();
});

// F-01 FR-03: GET /api/auth/me
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
