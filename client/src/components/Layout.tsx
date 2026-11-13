import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>✓</span> Donjaicheck
        </div>
        <nav className="nav">
          {user.role === "SURVEY_OWNER" ? (
            <NavLink to="/owner/surveys">My surveys</NavLink>
          ) : (
            <NavLink to="/surveys">Available surveys</NavLink>
          )}
        </nav>
        <div className="who">
          <span className="who-name">{user.name}</span>
          <span className="role">{user.role === "SURVEY_OWNER" ? "Survey owner" : "Respondent"}</span>
          <button className="btn btn-ghost" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
