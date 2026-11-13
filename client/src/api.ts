/** Small JSON client for the Donjaicheck API (system-sds.md §4). */

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: FieldError[] = []
  ) {
    super(message);
  }
  /** Message for one field, e.g. "title" or "questions[0].text". */
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }
}

export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? "GET";
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      // CSRF defence: the API rejects state-changing requests without this header.
      ...(method !== "GET" ? { "X-Requested-With": "Donjaicheck" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? "UNKNOWN", data.error ?? `Request failed (${res.status})`, data.details);
  }
  return data as T;
}

export type Role = "SURVEY_OWNER" | "RESPONDENT";
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}
