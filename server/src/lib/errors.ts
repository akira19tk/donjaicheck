import type { NextFunction, Request, Response } from "express";

export interface FieldError {
  field: string;
  message: string;
}

/** An error that maps to a safe JSON response (system-sds.md §4). */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: FieldError[]
  ) {
    super(message);
  }
}

export const notFound = () => new AppError(404, "NOT_FOUND", "Not found");
export const validationFailed = (details: FieldError[]) =>
  new AppError(400, "VALIDATION_FAILED", "Some fields are invalid", details);

/** Express error handler: never leaks stack traces or internal messages. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }
  // Malformed JSON body from express.json()
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body", code: "VALIDATION_FAILED" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
}
