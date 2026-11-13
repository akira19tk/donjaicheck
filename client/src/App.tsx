import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { RequireRole } from "./components/RequireRole";
import { Loading } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { MySurveysPage } from "./pages/owner/MySurveysPage";
import { SurveyDetailPage } from "./pages/owner/SurveyDetailPage";
import { SurveyEditorPage } from "./pages/owner/SurveyEditorPage";
import { AnswerSurveyPage } from "./pages/respondent/AnswerSurveyPage";
import { AvailableSurveysPage } from "./pages/respondent/AvailableSurveysPage";
import { ResponsePage } from "./pages/respondent/ResponsePage";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? homeFor(user) : "/login"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireRole role="SURVEY_OWNER" />}>
        <Route element={<Layout />}>
          <Route path="/owner/surveys" element={<MySurveysPage />} />
          <Route path="/owner/surveys/new" element={<SurveyEditorPage />} />
          <Route path="/owner/surveys/:id" element={<SurveyDetailPage />} />
          <Route path="/owner/surveys/:id/edit" element={<SurveyEditorPage />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="RESPONDENT" />}>
        <Route element={<Layout />}>
          <Route path="/surveys" element={<AvailableSurveysPage />} />
          <Route path="/surveys/:id" element={<AnswerSurveyPage />} />
          <Route path="/responses/:id" element={<ResponsePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
