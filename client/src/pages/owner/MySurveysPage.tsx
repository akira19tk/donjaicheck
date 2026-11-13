import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api";
import { EmptyState, ErrorBanner, Loading, StatusBadge } from "../../components/ui";
import { formatDate, type SurveyListItem } from "../../types";

/** FR-08: the owner's own surveys. */
export function MySurveysPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ surveys: SurveyListItem[] }>("/api/owner/surveys")
      .then((r) => setSurveys(r.surveys))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <section>
      <div className="page-head">
        <h1>My surveys</h1>
        <Link className="btn btn-primary" to="/owner/surveys/new">
          + New survey
        </Link>
      </div>
      <ErrorBanner message={error} />
      {!surveys && !error && <Loading />}
      {surveys && surveys.length === 0 && (
        <EmptyState title="No surveys yet">
          <p className="muted">Create your first customer satisfaction survey.</p>
        </EmptyState>
      )}
      {surveys && surveys.length > 0 && (
        <div className="list">
          {surveys.map((s) => (
            <div className="card list-item" key={s.id}>
              <div>
                <h3>
                  <Link to={`/owner/surveys/${s.id}`}>{s.title}</Link>
                </h3>
                <div className="meta">
                  <StatusBadge status={s.status} /> · {s.responseCount} response{s.responseCount === 1 ? "" : "s"} · created{" "}
                  {formatDate(s.createdAt)}
                </div>
              </div>
              <div className="actions">
                {s.status === "DRAFT" && (
                  <Link className="btn btn-small" to={`/owner/surveys/${s.id}/edit`}>
                    Edit
                  </Link>
                )}
                {s.status !== "DRAFT" && (
                  <Link className="btn btn-small" to={`/owner/surveys/${s.id}/summary`}>
                    Summary
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
