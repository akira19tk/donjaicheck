import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { homeFor, useAuth } from "../auth";
import { ErrorBanner, Loading } from "../components/ui";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loading />;
  if (user) return <Navigate to={homeFor(user)} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const u = await login(email, password);
      navigate(homeFor(u), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Cannot reach the server. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit} noValidate>
        <div className="brand brand-lg">
          <span className="logo" aria-hidden>✓</span> Donjaicheck
        </div>
        <p className="muted">Customer satisfaction surveys for Donjai Kitchen</p>
        <ErrorBanner message={error} />
        <label className="field">
          <span>Email *</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
        </label>
        <label className="field">
          <span>Password *</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
