import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { ErrorBanner, Loading } from "../../components/ui";
import type { Question, SurveyStatus } from "../../types";

interface RespondentSurvey {
  id: number;
  title: string;
  description: string;
  status: SurveyStatus;
  questions: Question[];
}

type AnswerValue = { rating?: number; optionId?: number; text?: string };

/** FR-10: answer a published survey (BR-01..BR-03 enforced by the API). */
export function AnswerSurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<RespondentSurvey | null>(null);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ survey: RespondentSurvey; responseId: number | null }>(`/api/surveys/${id}`)
      .then((r) => {
        setSurvey(r.survey);
        setResponseId(r.responseId);
      })
      .catch((e: Error) => setError(e instanceof ApiError && e.status === 404 ? "This survey is not available." : e.message));
  }, [id]);

  const set = (qid: number, value: AnswerValue) => setAnswers((a) => ({ ...a, [qid]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!survey) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const body = {
      answers: survey.questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({ questionId: q.id, ...answers[q.id] })),
    };
    try {
      const r = await apiFetch<{ response: { id: number } }>(`/api/surveys/${survey.id}/responses`, { method: "POST", body });
      navigate(`/responses/${r.response.id}`, { state: { justSubmitted: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
        setError(err.code === "VALIDATION_FAILED" ? "Please answer the highlighted questions." : err.message);
      } else setError("Cannot reach the server.");
      window.scrollTo?.({ top: 0 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!survey) return error ? <ErrorBanner message={error} /> : <Loading />;
  if (responseId) return <Navigate to={`/responses/${responseId}`} replace />;

  return (
    <section>
      <h1>{survey.title}</h1>
      {survey.description && <p>{survey.description}</p>}
      {survey.status === "CLOSED" ? (
        <div className="banner banner-error">This survey is closed and no longer accepts responses.</div>
      ) : (
        <form className="card" onSubmit={onSubmit} noValidate>
          <p className="identified-note">This is an identified survey: your answers are linked to your account.</p>
          <ErrorBanner message={error} />
          {survey.questions.map((q) => {
            const err = fieldErrors[`answers[q:${q.id}]`];
            const value = answers[q.id] ?? {};
            return (
              <fieldset className="answer-q" key={q.id} aria-invalid={Boolean(err)}>
                <legend>
                  {q.position}. {q.text} {q.required && <span aria-label="required">*</span>}
                </legend>
                {q.type === "RATING" && (
                  <div className="rating" role="radiogroup" aria-label={q.text}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} title={`${n} of 5`}>
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={n}
                          checked={value.rating === n}
                          onChange={() => set(q.id, { rating: n })}
                        />
                        <span>{n}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "SINGLE_CHOICE" && (
                  <div className="choices">
                    {q.options.map((o) => (
                      <label key={o.id}>
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          checked={value.optionId === o.id}
                          onChange={() => set(q.id, { optionId: o.id })}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "TEXT" && (
                  <div className="field">
                    <textarea
                      aria-label={q.text}
                      rows={3}
                      maxLength={500}
                      value={value.text ?? ""}
                      onChange={(e) => set(q.id, { text: e.target.value })}
                    />
                    <small className="muted">{(value.text ?? "").length}/500</small>
                  </div>
                )}
                {err && <small className="field-error">{err}</small>}
              </fieldset>
            );
          })}
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit answers"}
            </button>
            <Link className="btn btn-ghost" to="/surveys">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
