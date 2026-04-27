import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import NextWeekPage from "./pages/NextWeekPage";
import ThisWeekPage from "./pages/ThisWeekPage";
import TodayPage from "./pages/TodayPage";
import TomorrowPage from "./pages/TomorrowPage";
import TrashPage from "./pages/TrashPage";

const App = () => {
  return (
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
  );
};

export default App;
