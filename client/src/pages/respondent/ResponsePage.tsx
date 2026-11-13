import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { ErrorBanner, Loading, SuccessBanner } from "../../components/ui";
import { formatDate, type QuestionType } from "../../types";

interface MyResponse {
  id: number;
  submittedAt: string;
  survey: { id: number; title: string };
  answers: { questionId: number; questionText: string; type: QuestionType; rating: number | null; optionLabel: string | null; text: string | null }[];
}

/** FR-10 confirmation + FR-11 own response (BR-07). */
export function ResponsePage() {
  const { id } = useParams();
  const location = useLocation();
  const justSubmitted = Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted);
  const [response, setResponse] = useState<MyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ response: MyResponse }>(`/api/responses/${id}`)
      .then((r) => setResponse(r.response))
      .catch((e: Error) => setError(e instanceof ApiError && e.status === 404 ? "Response not found." : e.message));
  }, [id]);

  if (!response) return error ? <ErrorBanner message={error} /> : <Loading />;

  return (
    <section>
      {justSubmitted && <SuccessBanner>Thank you! Your answers were submitted at {formatDate(response.submittedAt)}.</SuccessBanner>}
      <h1>{response.survey.title}</h1>
      <p className="meta">Submitted {formatDate(response.submittedAt)}</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>My answers</h2>
        <dl>
          {response.answers.map((a) => (
            <div key={a.questionId} style={{ marginBottom: "0.75rem" }}>
              <dt>
                <strong>{a.questionText}</strong>
              </dt>
              <dd style={{ margin: 0 }}>{a.rating !== null ? `${a.rating} / 5` : a.optionLabel ?? a.text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p>
        <Link to="/surveys">← Back to available surveys</Link>
      </p>
    </section>
  );
}
