import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { ErrorBanner, Loading, SuccessBanner } from "../../components/ui";
import { isChoiceType, TYPE_LABEL, type QuestionType, type SurveyDetail } from "../../types";

interface DraftQuestion {
  key: number;
  text: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  /** F-09: text of the min/max inputs ("" = use the default) */
  minSelections: string;
  maxSelections: string;
}

let nextKey = 1;
const blankQuestion = (type: QuestionType = "RATING"): DraftQuestion => ({
  key: nextKey++,
  text: "",
  type,
  required: true,
  options: isChoiceType(type) ? ["", ""] : [],
  minSelections: "",
  maxSelections: "",
});

/** "" -> undefined (server applies the BR-12 default); otherwise the number typed. */
const limit = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** F-03: create a new draft (/owner/surveys/new) or edit an own draft (/owner/surveys/:id/edit). */
export function SurveyEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const duplicated = Boolean((useLocation().state as { duplicated?: boolean } | null)?.duplicated);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresVisitCode, setRequiresVisitCode] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the survey cannot be edited at all (not found / not own / not a draft): show only the message, no form.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${id}`)
      .then(({ survey }) => {
        if (survey.status !== "DRAFT") {
          setLoadError("Only draft surveys can be edited.");
          return;
        }
        setTitle(survey.title);
        setDescription(survey.description);
        setRequiresVisitCode(survey.requiresVisitCode);
        setQuestions(
          survey.questions.map((q) => ({
            key: nextKey++,
            text: q.text,
            type: q.type,
            required: q.required,
            options: q.options.map((o) => o.label),
            minSelections: q.minSelections != null ? String(q.minSelections) : "",
            maxSelections: q.maxSelections != null ? String(q.maxSelections) : "",
          }))
        );
      })
      .catch((e: Error) => setLoadError(e instanceof ApiError && e.status === 404 ? "Survey not found." : e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (key: number, patch: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  const changeType = (key: number, type: QuestionType) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === key
          ? { ...q, type, options: isChoiceType(type) ? (isChoiceType(q.type) ? q.options : ["", ""]) : [], minSelections: "", maxSelections: "" }
          : q
      )
    );

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
      requiresVisitCode,
      questions: questions.map(({ text, type, required, options, minSelections, maxSelections }) =>
        type === "MULTIPLE_CHOICE"
          ? { text, type, required, options, minSelections: limit(minSelections), maxSelections: limit(maxSelections) }
          : { text, type, required, options }
      ),
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
  if (loadError)
    return (
      <section>
        <ErrorBanner message={loadError} />
        <Link className="btn btn-ghost" to="/owner/surveys">
          Back to My surveys
        </Link>
      </section>
    );

  return (
    <section>
      <div className="page-head">
        <h1>{editing ? "Edit draft survey" : "New survey"}</h1>
        <Link className="btn btn-ghost" to={editing ? `/owner/surveys/${id}` : "/owner/surveys"}>
          Cancel
        </Link>
      </div>
      {duplicated && <SuccessBanner>Copy created — edit and publish when ready.</SuccessBanner>}
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
        <label className="checkbox">
          <input type="checkbox" checked={requiresVisitCode} onChange={(e) => setRequiresVisitCode(e.target.checked)} />
          Require a visit code (printed on the receipt) to answer
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
              {isChoiceType(q.type) && (
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
                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="option-row">
                      <label className={`field ${fe("minSelections") ? "has-error" : ""}`}>
                        <span>Min selections</span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          placeholder={q.required ? "1" : "0"}
                          value={q.minSelections}
                          onChange={(e) => update(q.key, { minSelections: e.target.value })}
                        />
                        {fe("minSelections") && <small className="field-error">{fe("minSelections")}</small>}
                      </label>
                      <label className={`field ${fe("maxSelections") ? "has-error" : ""}`}>
                        <span>Max selections</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          placeholder={String(q.options.length)}
                          value={q.maxSelections}
                          onChange={(e) => update(q.key, { maxSelections: e.target.value })}
                        />
                        {fe("maxSelections") && <small className="field-error">{fe("maxSelections")}</small>}
                      </label>
                    </div>
                  )}
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
