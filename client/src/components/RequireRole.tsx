import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "../api";
import { homeFor, useAuth } from "../auth";
import { Loading } from "./ui";

/**
 * Route guard for convenience only: the API enforces every permission (F-02).
 * Not signed in -> /login. Wrong role -> the user's own home page.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
