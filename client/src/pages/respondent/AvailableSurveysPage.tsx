import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api";
import { EmptyState, ErrorBanner, Loading } from "../../components/ui";

interface AvailableSurvey {
  id: number;
  title: string;
  description: string;
  questionCount: number;
  hasResponded: boolean;
  responseId: number | null;
}

/** FR-09: published surveys for the signed-in customer. */
export function AvailableSurveysPage() {
  const [surveys, setSurveys] = useState<AvailableSurvey[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ surveys: AvailableSurvey[] }>("/api/surveys")
      .then((r) => setSurveys(r.surveys))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <section>
      <h1>Available surveys</h1>
      <ErrorBanner message={error} />
      {!surveys && !error && <Loading />}
      {surveys && surveys.length === 0 && <EmptyState title="No surveys open right now">Please check back after your next visit.</EmptyState>}
      {surveys && surveys.length > 0 && (
        <div className="list">
          {surveys.map((s) => (
            <div className="card list-item" key={s.id}>
              <div>
                <h3>{s.title}</h3>
                {s.description && <p className="muted" style={{ margin: "0 0 0.25rem" }}>{s.description}</p>}
                <div className="meta">
                  {s.questionCount} question{s.questionCount === 1 ? "" : "s"}
                  {s.hasResponded && (
                    <>
                      {" · "}
                      <span className="badge badge-answered">Answered</span>
                    </>
                  )}
                </div>
              </div>
              {s.hasResponded && s.responseId ? (
                <Link className="btn" to={`/responses/${s.responseId}`}>
                  View my answers
                </Link>
              ) : (
                <Link className="btn btn-primary" to={`/surveys/${s.id}`}>
                  Answer
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
