/**
 * Route table for F-02 access tests (system-sds.md §5).
 * Every protected endpoint must be listed here; TEST-02-01/02 iterate over it.
 * ":id" is replaced with a real id by the tests.
 */
export type Method = "get" | "post" | "put";
export interface ProtectedRoute {
  method: Method;
  path: string;
  role: "ANY" | "SURVEY_OWNER" | "RESPONDENT";
}

export const PROTECTED_ROUTES: ProtectedRoute[] = [
  { method: "get", path: "/api/auth/me", role: "ANY" },
  { method: "post", path: "/api/auth/logout", role: "ANY" },
  // F-03 / F-04 (owner)
  { method: "get", path: "/api/owner/surveys", role: "SURVEY_OWNER" },
  { method: "post", path: "/api/owner/surveys", role: "SURVEY_OWNER" },
  { method: "get", path: "/api/owner/surveys/:id", role: "SURVEY_OWNER" },
  { method: "put", path: "/api/owner/surveys/:id", role: "SURVEY_OWNER" },
  { method: "post", path: "/api/owner/surveys/:id/publish", role: "SURVEY_OWNER" },
  { method: "post", path: "/api/owner/surveys/:id/close", role: "SURVEY_OWNER" },
  // F-05 (respondent)
  { method: "get", path: "/api/surveys", role: "RESPONDENT" },
  { method: "get", path: "/api/surveys/:id", role: "RESPONDENT" },
  { method: "post", path: "/api/surveys/:id/responses", role: "RESPONDENT" },
  { method: "get", path: "/api/responses/:id", role: "RESPONDENT" },
];
