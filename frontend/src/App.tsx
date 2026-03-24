import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ProfileGate } from "./auth/ProfileGate";
import { LoginPage } from "./auth/LoginPage";
import { BottomNav } from "./components/NavBar/BottomNav";
import { Dashboard } from "./pages/Dashboard";
import { NewRunPage } from "./pages/NewRunPage";
import { PlannedRunsPage } from "./pages/PlannedRunsPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";

function AppRoutes() {
  const location = useLocation();
  const showNav = location.pathname !== "/login" && location.pathname !== "/setup";

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <ProfileSetupPage />
              </ProfileGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <Dashboard />
              </ProfileGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs/new"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <NewRunPage />
              </ProfileGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs/:runId"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <RunDetailPage />
              </ProfileGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/planned"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <PlannedRunsPage />
              </ProfileGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <ProfilePage />
              </ProfileGate>
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
