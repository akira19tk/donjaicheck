import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api";
import { ErrorBanner, Loading, StatusBadge, SuccessBanner } from "../../components/ui";
import { formatDate, formatVisitCode, fromLocalInput, toLocalInput, TYPE_LABEL, type SurveyDetail, type VisitCodeItem } from "../../types";

/** F-08: set, change or remove the scheduled closing time of a DRAFT or PUBLISHED survey. */
function ClosingTimeBox({ survey, onSaved }: { survey: SurveyDetail; onSaved: (s: SurveyDetail) => void }) {
  const [value, setValue] = useState(toLocalInput(survey.closesAt));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (closesAt: string | null) => {
    setSaving(true);
    setError(null);
    try {
      const r = await apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${survey.id}/closing`, { method: "PUT", body: { closesAt } });
      setValue(toLocalInput(r.survey.closesAt));
      onSaved(r.survey);
    } catch (e) {
      setError(e instanceof ApiError ? e.fieldError("closesAt") ?? e.message : "Cannot reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" aria-label="Closing time">
      <strong>Closing time</strong>
      <div className="meta">
        {survey.closesAt ? <>Closes automatically on {formatDate(survey.closesAt)}</> : "No closing time — the survey stays open until you close it."}
      </div>
      <div className="actions" style={{ marginTop: "0.5rem" }}>
        <label>
          <span className="sr-only">Closes at</span>
          <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Closes at" />
        </label>
        <button className="btn btn-small" disabled={saving || !value} onClick={() => save(fromLocalInput(value))}>
          Save closing time
        </button>
        {survey.closesAt && (
          <button className="btn btn-small btn-ghost" disabled={saving} onClick={() => save(null)}>
            Remove
          </button>
        )}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

/** F-07: generate and list single-use visit codes of a restricted survey. */
function VisitCodesPanel({ survey, onChanged }: { survey: SurveyDetail; onChanged: () => void }) {
  const [codes, setCodes] = useState<VisitCodeItem[] | null>(null);
  const [count, setCount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    apiFetch<{ codes: VisitCodeItem[] }>(`/api/owner/surveys/${survey.id}/visit-codes`)
      .then((r) => setCodes(r.codes))
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey.id]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/owner/surveys/${survey.id}/visit-codes`, { method: "POST", body: { count: Number(count) } });
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.fieldError("count") ?? e.message : "Cannot reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const used = codes?.filter((c) => c.usedAt).length ?? 0;
  return (
    <div className="card" aria-label="Visit codes">
      <strong>Visit codes</strong>{" "}
      <span className="meta">
        {codes ? `${used} of ${codes.length} used` : "Loading…"} · customers need one unused code to answer
      </span>
      {survey.status !== "CLOSED" && (
        <div className="actions" style={{ marginTop: "0.5rem" }}>
          <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} aria-label="Number of codes" style={{ width: "5rem" }} />
          <button className="btn btn-small" disabled={busy} onClick={generate}>
            Generate codes
          </button>
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
      {codes && codes.length > 0 && (
        <table className="codes">
          <thead>
            <tr>
              <th>Code</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code}>
                <td>
                  <code>{formatVisitCode(c.code)}</code>
                </td>
                <td>{formatDate(c.createdAt)}</td>
                <td>{c.usedAt ? `Used ${formatDate(c.usedAt)}` : "Unused"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** F-03 view + F-04 publish/close + F-08 closing time + F-07 visit codes. */
export function SurveyDetailPage() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  /** F-13: copy this survey into a new draft and open it in the editor. */
  const duplicate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${id}/duplicate`, { method: "POST" });
      navigate(`/owner/surveys/${r.survey.id}/edit`, { state: { duplicated: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setNotice(null);
    apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${id}`)
      .then((r) => setSurvey(r.survey))
      .catch((e: Error) => setError(e instanceof ApiError && e.status === 404 ? "Survey not found." : e.message));
  }, [id]);

  const act = async (action: "publish" | "close") => {
    const question =
      action === "publish"
        ? "Publish this survey? Customers can answer it and it can no longer be edited."
        : "Close this survey? It will stop accepting responses and cannot be reopened.";
    if (!window.confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${id}/${action}`, { method: "POST" });
      setSurvey(r.survey);
      setNotice(action === "publish" ? "Survey published." : "Survey closed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!survey) return error ? <ErrorBanner message={error} /> : <Loading />;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{survey.title}</h1>
          <div className="meta">
            <StatusBadge status={survey.status} /> · {survey.responseCount} responses · published {formatDate(survey.publishedAt)}
            {survey.closedAt && <> · closed {formatDate(survey.closedAt)}</>}
            {survey.status === "CLOSED" && survey.closesAt && survey.closedAt === survey.closesAt && <> (scheduled)</>}
          </div>
        </div>
        <div className="actions">
          {survey.status === "DRAFT" && (
            <>
              <Link className="btn" to={`/owner/surveys/${survey.id}/edit`}>
                Edit
              </Link>
              <button className="btn btn-primary" onClick={() => act("publish")} disabled={busy}>
                Publish
              </button>
            </>
          )}
          {survey.status === "PUBLISHED" && (
            <button className="btn btn-danger" onClick={() => act("close")} disabled={busy}>
              Close survey
            </button>
          )}
          <button className="btn" onClick={duplicate} disabled={busy}>
            Duplicate
          </button>
          {survey.status !== "DRAFT" && (
            <Link className="btn btn-primary" to={`/owner/surveys/${survey.id}/summary`}>
              View summary
            </Link>
          )}
        </div>
      </div>
      <ErrorBanner message={error} />
      {notice && <SuccessBanner>{notice}</SuccessBanner>}
      {survey.status !== "CLOSED" && (
        <ClosingTimeBox
          survey={survey}
          onSaved={(s) => {
            setSurvey(s);
            setNotice(s.closesAt ? "Closing time saved." : "Closing time removed.");
          }}
        />
      )}
      {survey.requiresVisitCode && (
        <VisitCodesPanel
          survey={survey}
          onChanged={() =>
            apiFetch<{ survey: SurveyDetail }>(`/api/owner/surveys/${survey.id}`)
              .then((r) => setSurvey(r.survey))
              .catch(() => undefined)
          }
        />
      )}
      {survey.description && <p>{survey.description}</p>}
      {survey.questions.length === 0 && <p className="muted">This draft has no questions yet. Add at least one before publishing.</p>}
      <ol className="list" style={{ paddingLeft: "1.2rem" }}>
        {survey.questions.map((q) => (
          <li key={q.id} className="card">
            <strong>{q.text}</strong> {q.required && <span className="muted">(required)</span>}
            <div className="meta">{TYPE_LABEL[q.type]}</div>
            {q.options.length > 0 && <div className="meta">Options: {q.options.map((o) => o.label).join(" · ")}</div>}
          </li>
        ))}
      </ol>
      <p>
        <Link to="/owner/surveys">← Back to my surveys</Link>
      </p>
    </section>
  );
}
