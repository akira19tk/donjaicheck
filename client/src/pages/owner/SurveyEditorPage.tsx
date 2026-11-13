import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { ErrorBanner, Loading } from "../../components/ui";
import { TYPE_LABEL, type QuestionType, type SurveyDetail } from "../../types";

interface DraftQuestion {
  key: number;
  text: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}

let nextKey = 1;
const blankQuestion = (type: QuestionType = "RATING"): DraftQuestion => ({
  key: nextKey++,
  text: "",
  type,
  required: true,
  options: type === "SINGLE_CHOICE" ? ["", ""] : [],
});

/** F-03: create a new draft (/owner/surveys/new) or edit an own draft (/owner/surveys/:id/edit). */
export function SurveyEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${id}`)
      .then(({ survey }) => {
        if (survey.status !== "DRAFT") {
          setError("Only draft surveys can be edited.");
          return;
        }
        setTitle(survey.title);
        setDescription(survey.description);
        setQuestions(
          survey.questions.map((q) => ({
            key: nextKey++,
            text: q.text,
            type: q.type,
            required: q.required,
            options: q.options.map((o) => o.label),
          }))
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (key: number, patch: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  const changeType = (key: number, type: QuestionType) =>
    update(key, { type, options: type === "SINGLE_CHOICE" ? ["", ""] : [] });

  const move = (index: number, delta: number) =>
    setQuestions((qs) => {
      const target = index + delta;
      if (target < 0 || target >= qs.length) return qs;
      const copy = [...qs];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body = {
      title,
      description,
      questions: questions.map(({ text, type, required, options }) => ({ text, type, required, options })),
    };
    try {
      const { survey } = await apiFetch<{ survey: SurveyDetail }>(editing ? `/api/owner/surveys/${id}` : "/api/owner/surveys", {
        method: editing ? "PUT" : "POST",
        body,
      });
      navigate(`/owner/surveys/${survey.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === "VALIDATION_FAILED" ? "Please fix the highlighted fields." : err.message);
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else setError("Cannot reach the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <section>
      <div className="page-head">
        <h1>{editing ? "Edit draft survey" : "New survey"}</h1>
        <Link className="btn btn-ghost" to={editing ? `/owner/surveys/${id}` : "/owner/surveys"}>
          Cancel
        </Link>
      </div>
      <ErrorBanner message={error} />
      <form className="card" onSubmit={onSubmit} noValidate>
        <label className={`field ${fieldErrors.title ? "has-error" : ""}`}>
          <span>Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Dinner experience at Donjai Siam" />
          {fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}
        </label>
        <label className={`field ${fieldErrors.description ? "has-error" : ""}`}>
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
          {fieldErrors.description && <small className="field-error">{fieldErrors.description}</small>}
        </label>

        <h2>Questions ({questions.length}/20)</h2>
        {fieldErrors.questions && <p className="field-error">{fieldErrors.questions}</p>}
        {questions.map((q, i) => {
          const fe = (name: string) => fieldErrors[`questions[${i}].${name}`];
          return (
            <div className="question-card" key={q.key} data-testid={`question-${i}`}>
              <div className="question-head">
                <label className={`field ${fe("text") ? "has-error" : ""}`}>
                  <span>Question {i + 1} *</span>
                  <input value={q.text} onChange={(e) => update(q.key, { text: e.target.value })} maxLength={200} />
                  {fe("text") && <small className="field-error">{fe("text")}</small>}
                </label>
                <label className="field">
                  <span>Type</span>
                  <select value={q.type} onChange={(e) => changeType(q.key, e.target.value as QuestionType)}>
                    {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {q.type === "SINGLE_CHOICE" && (
                <div>
                  {q.options.map((opt, j) => (
                    <div className="option-row" key={j}>
                      <input
                        aria-label={`Question ${i + 1} option ${j + 1}`}
                        value={opt}
                        onChange={(e) => update(q.key, { options: q.options.map((o, k) => (k === j ? e.target.value : o)) })}
                        maxLength={60}
                      />
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={q.options.length <= 2}
                        onClick={() => update(q.key, { options: q.options.filter((_, k) => k !== j) })}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {fe("options") && <small className="field-error">{fe("options")}</small>}
                  <div>
                    <button
                      type="button"
                      className="btn btn-small"
                      disabled={q.options.length >= 10}
                      onClick={() => update(q.key, { options: [...q.options, ""] })}
                    >
                      + Add option
                    </button>
                  </div>
                </div>
              )}
              <div className="actions" style={{ marginTop: "0.6rem", alignItems: "center" }}>
                <label className="checkbox">
                  <input type="checkbox" checked={q.required} onChange={(e) => update(q.key, { required: e.target.checked })} />
                  Required
                </label>
                <button type="button" className="btn btn-small" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button type="button" className="btn btn-small" onClick={() => move(i, 1)} disabled={i === questions.length - 1}>
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                >
                  Delete question
                </button>
              </div>
            </div>
          );
        })}
        <div className="actions">
          <button type="button" className="btn" disabled={questions.length >= 20} onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
            + Add question
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </button>
        </div>
      </form>
    </section>
  );
}
