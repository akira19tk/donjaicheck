import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { RequireRole } from "./components/RequireRole";
import { Loading } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { OwnerHome, RespondentHome } from "./pages/Placeholder";

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
          <Route path="/owner/surveys" element={<OwnerHome />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="RESPONDENT" />}>
        <Route element={<Layout />}>
          <Route path="/surveys" element={<RespondentHome />} />
        </Route>
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
