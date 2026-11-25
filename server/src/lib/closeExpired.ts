/** F-08 (BR-11): close every PUBLISHED survey whose closing time has passed. Idempotent, one SQL statement. */
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma";

export async function closeExpiredSurveys(): Promise<number> {
  // Prisma stores DateTime as TIMESTAMP(3) without time zone, holding UTC. Compare against UTC "now"
  // explicitly; a bare NOW() is converted with the session TimeZone (e.g. Asia/Bangkok) and would
  // close surveys hours early.
  return prisma.$executeRaw`
    UPDATE "Survey"
       SET "status" = 'CLOSED', "closedAt" = "closesAt", "updatedAt" = (NOW() AT TIME ZONE 'UTC')
     WHERE "status" = 'PUBLISHED' AND "closesAt" IS NOT NULL AND "closesAt" <= (NOW() AT TIME ZONE 'UTC')`;
}

/** Express middleware: run before any route that reads or answers surveys. */
export async function closeExpired(_req: Request, _res: Response, next: NextFunction) {
  try {
    await closeExpiredSurveys();
    next();
  } catch (e) {
    next(e);
  }
}
