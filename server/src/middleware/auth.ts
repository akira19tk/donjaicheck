import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { hashSessionToken } from "../lib/auth";
import { AppError } from "../lib/errors";

export const SESSION_COOKIE = "dc_session";
export const CSRF_HEADER = "x-requested-with";
export const CSRF_VALUE = "Donjaicheck";

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: CurrentUser;
    sessionTokenHash?: string;
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Authentication required");

/** F-02: loads the user from the session cookie or rejects with 401. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return next(unauthenticated());

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return next(unauthenticated());

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return next(new AppError(401, "UNAUTHENTICATED", "Session expired"));
  }

  const { id, name, email, role } = session.user;
  req.user = { id, name, email, role };
  req.sessionTokenHash = tokenHash;
  next();
}

/** F-02: only the listed roles may continue; others get 403. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "You are not allowed to do this"));
    }
    next();
  };
}

/** CSRF defence for state-changing requests (system-sds.md §4). */
export function csrfCheck(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers[CSRF_HEADER] === CSRF_VALUE) return next();
  next(new AppError(403, "CSRF_REJECTED", "Missing X-Requested-With header"));
}
