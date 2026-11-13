import { Router } from "express";
import { prisma } from "../prisma";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Readiness: proves the API can reach the database (used by the Lab 5 smoke test).
healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "connected" });
  } catch {
    res.status(503).json({ status: "not_ready", db: "unreachable" });
  }
});
