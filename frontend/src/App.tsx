import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./auth/LoginPage";
import { BottomNav } from "./components/NavBar/BottomNav";
import { Dashboard } from "./pages/Dashboard";
import { NewRunPage } from "./pages/NewRunPage";
import { PlannedRunsPage } from "./pages/PlannedRunsPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { ProfilePage } from "./pages/ProfilePage";

function AppRoutes() {
  const location = useLocation();
  const showNav = location.pathname !== "/login";

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs/new"
          element={
            <ProtectedRoute>
              <NewRunPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs/:runId"
          element={
            <ProtectedRoute>
              <RunDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planned"
          element={
            <ProtectedRoute>
              <PlannedRunsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
