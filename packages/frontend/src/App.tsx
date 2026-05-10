import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import NextWeekPage from "./pages/NextWeekPage";
import ThisWeekPage from "./pages/ThisWeekPage";
import TodayPage from "./pages/TodayPage";
import TomorrowPage from "./pages/TomorrowPage";
import TrashPage from "./pages/TrashPage";
import OnboardingPage from "./pages/OnboardingPage";
import LoginPage from "./pages/LoginPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";

// ProtectedRoute가 보호 라우트들의 공통 부모로 한 번만 감싸지므로
// 페이지 전환 시 마운트가 유지되어 /api/auth/me 호출은 1회로 끝난다.
const App = () => {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/today" replace />} />
                <Route path="/today" element={<TodayPage />} />
                <Route path="/tomorrow" element={<TomorrowPage />} />
                <Route path="/this-week" element={<ThisWeekPage />} />
                <Route path="/next-week" element={<NextWeekPage />} />
                <Route path="/trash" element={<TrashPage />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
