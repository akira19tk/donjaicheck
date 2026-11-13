import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { EmptyState, ErrorBanner, Loading, StatusBadge } from "../../components/ui";
import type { QuestionType, SurveyStatus } from "../../types";

interface QuestionSummary {
  questionId: number;
  position: number;
  text: string;
  type: QuestionType;
  answered: number;
  average?: number | null;
  distribution?: Record<string, number>;
  options?: { optionId: number; label: string; count: number }[];
  texts?: string[];
}

interface Summary {
  survey: { id: number; title: string; status: SurveyStatus };
  responseCount: number;
  questions: QuestionSummary[];
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div className="bar" role="img" aria-label={`${label}: ${count}`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <span className="meta">
        {count} ({pct}%)
      </span>
    </div>
  );
}

/** FR-12 / F-06: aggregate results of an own survey. */
export function SummaryPage() {
  const { id } = useParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Summary>(`/api/owner/surveys/${id}/summary`)
      .then(setSummary)
      .catch((e: Error) => setError(e instanceof ApiError && e.status === 404 ? "Survey not found." : e.message));
  }, [id]);

  if (!summary) return error ? <ErrorBanner message={error} /> : <Loading />;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Summary: {summary.survey.title}</h1>
          <div className="meta">
            <StatusBadge status={summary.survey.status} />
          </div>
        </div>
        <Link className="btn" to={`/owner/surveys/${summary.survey.id}`}>
          Survey details
        </Link>
      </div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="muted">Responses</div>
        <div className="stat" data-testid="response-count">
          {summary.responseCount}
        </div>
      </div>
      {summary.responseCount === 0 ? (
        <EmptyState title="No responses yet">Results appear here as soon as customers answer.</EmptyState>
      ) : (
        <div className="list">
          {summary.questions.map((q) => (
            <div className="card" key={q.questionId}>
              <h3 style={{ marginTop: 0 }}>
                {q.position}. {q.text}
              </h3>
              <div className="meta" style={{ marginBottom: "0.5rem" }}>
                {q.answered} answer{q.answered === 1 ? "" : "s"}
                {q.type === "RATING" && q.average !== null && q.average !== undefined && (
                  <>
                    {" · average "}
                    <strong>{q.average.toFixed(2)}</strong> / 5
                  </>
                )}
              </div>
              {q.type === "RATING" &&
                q.distribution &&
                ["5", "4", "3", "2", "1"].map((k) => <Bar key={k} label={`${k} ★`} count={q.distribution![k]} total={q.answered} />)}
              {q.type === "SINGLE_CHOICE" && q.options?.map((o) => <Bar key={o.optionId} label={o.label} count={o.count} total={q.answered} />)}
              {q.type === "TEXT" &&
                (q.texts && q.texts.length ? (
                  <ul className="texts">
                    {q.texts.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No comments.</p>
                ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
