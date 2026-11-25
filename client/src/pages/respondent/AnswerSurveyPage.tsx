import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { ErrorBanner, Loading } from "../../components/ui";
import type { Question, SurveyStatus } from "../../types";
import { formatDate } from "../../types";

interface RespondentSurvey {
  id: number;
  title: string;
  description: string;
  status: SurveyStatus;
  closesAt?: string | null;
  requiresVisitCode?: boolean;
  questions: Question[];
}

type AnswerValue = { rating?: number; optionId?: number; optionIds?: number[]; text?: string };

/** F-09 hint, e.g. "Choose 1–2" / "Choose up to 3". */
export const selectionHint = (q: Question) => {
  const max = q.maxSelections ?? q.options.length;
  const min = q.minSelections ?? (q.required ? 1 : 0);
  if (min === max) return `Choose ${min}`;
  return min > 0 ? `Choose ${min}–${max}` : `Choose up to ${max}`;
};

interface OwnResponse {
  id: number;
  survey: { id: number };
  canEdit: boolean;
  answers: { questionId: number; rating: number | null; optionId: number | null; optionIds?: number[]; text: string | null }[];
}

/**
 * FR-10: answer a published survey (BR-01..BR-03 enforced by the API).
 * CR-01: at /responses/:responseId/edit the same form corrects my own response (BR-15).
 */
export function AnswerSurveyPage() {
  const { id: routeSurveyId, responseId: editId } = useParams();
  const editing = Boolean(editId);
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<RespondentSurvey | null>(null);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [visitCode, setVisitCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      let surveyId = routeSurveyId;
      if (editId) {
        // CR-01: pre-fill the form with my current answers.
        const { response } = await apiFetch<{ response: OwnResponse }>(`/api/responses/${editId}`);
        if (!response.canEdit) throw new Error("These answers can no longer be changed.");
        surveyId = String(response.survey.id);
        setAnswers(
          Object.fromEntries(
            response.answers.map((a) => [
              a.questionId,
              a.rating !== null
                ? { rating: a.rating }
                : a.optionIds && a.optionIds.length
                  ? { optionIds: a.optionIds }
                  : a.optionId !== null
                    ? { optionId: a.optionId }
                    : { text: a.text ?? "" },
            ])
          )
        );
      }
      const r = await apiFetch<{ survey: RespondentSurvey; responseId: number | null }>(`/api/surveys/${surveyId}`);
      setSurvey(r.survey);
      if (!editId) setResponseId(r.responseId);
    };
    load().catch((e: Error) => setError(e instanceof ApiError && e.status === 404 ? "This survey is not available." : e.message));
  }, [routeSurveyId, editId]);

  const set = (qid: number, value: AnswerValue) => setAnswers((a) => ({ ...a, [qid]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!survey) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const body = {
      answers: survey.questions
        .filter((q) => answers[q.id] !== undefined && !(answers[q.id].optionIds && answers[q.id].optionIds!.length === 0))
        .map((q) => ({ questionId: q.id, ...answers[q.id] })),
      ...(survey.requiresVisitCode && !editing ? { visitCode } : {}),
    };
    try {
      if (editing) {
        await apiFetch(`/api/responses/${editId}`, { method: "PUT", body: { answers: body.answers } });
        navigate(`/responses/${editId}`, { state: { justEdited: true } });
        return;
      }
      const r = await apiFetch<{ response: { id: number } }>(`/api/surveys/${survey.id}/responses`, { method: "POST", body });
      navigate(`/responses/${r.response.id}`, { state: { justSubmitted: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = Object.fromEntries(err.details.map((d) => [d.field, d.message]));
        // F-07: code problems come back as error codes, shown next to the code field.
        if (err.code === "INVALID_VISIT_CODE" || err.code === "VISIT_CODE_USED") fe.visitCode = err.message;
        setFieldErrors(fe);
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
          {survey.closesAt && <p className="meta">Open until {formatDate(survey.closesAt)}</p>}
          {editing && <p className="meta">You are changing answers you already sent.</p>}
          {survey.requiresVisitCode && !editing && (
            <label className={`field ${fieldErrors.visitCode ? "has-error" : ""}`}>
              <span>Visit code (printed on your receipt) *</span>
              <input value={visitCode} onChange={(e) => setVisitCode(e.target.value)} placeholder="AB3K-9QXZ" maxLength={12} autoComplete="off" />
              {fieldErrors.visitCode && <small className="field-error">{fieldErrors.visitCode}</small>}
            </label>
          )}
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
                {q.type === "MULTIPLE_CHOICE" && (
                  <div className="choices">
                    <small className="muted">{selectionHint(q)}</small>
                    {q.options.map((o) => {
                      const picked = value.optionIds ?? [];
                      return (
                        <label key={o.id}>
                          <input
                            type="checkbox"
                            checked={picked.includes(o.id)}
                            onChange={(e) =>
                              set(q.id, { optionIds: e.target.checked ? [...picked, o.id] : picked.filter((x) => x !== o.id) })
                            }
                          />
                          {o.label}
                        </label>
                      );
                    })}
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
              {submitting ? "Saving…" : editing ? "Save changes" : "Submit answers"}
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
