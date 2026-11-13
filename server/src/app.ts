import express from "express";
import { healthRouter } from "./routes/health";
import { errorHandler, notFound } from "./lib/errors";

// Skeleton only: F-01 routes are added in the implementation commit.
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", healthRouter);
  app.use("/api", (_req, _res, next) => next(notFound()));
  app.use(errorHandler);
  return app;
}
