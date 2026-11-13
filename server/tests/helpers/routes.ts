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
];
