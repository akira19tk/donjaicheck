import express from "express";
import fs from "fs";
import path from "path";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { ownerRouter } from "./routes/owner";
import { respondentRouter } from "./routes/respondent";
import { csrfCheck } from "./middleware/auth";
import { errorHandler, notFound } from "./lib/errors";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Cloud Run terminates HTTPS in front of the container
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", healthRouter);
  app.use("/api", csrfCheck);
  app.use("/api/auth", authRouter);
  app.use("/api/owner", ownerRouter);
  app.use("/api", respondentRouter);

  // Unknown API paths return JSON 404, never the SPA.
  app.use("/api", (_req, _res, next) => next(notFound()));

  // Production: serve the built React app from the same container.
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
