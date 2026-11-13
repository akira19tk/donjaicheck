import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError, type User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore identity from the session cookie (FR-03).
  useEffect(() => {
    apiFetch<{ user: User }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<{ user: User }>("/api/auth/login", { method: "POST", body: { email, password } });
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const homeFor = (user: User) => (user.role === "SURVEY_OWNER" ? "/owner/surveys" : "/surveys");
