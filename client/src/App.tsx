import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import LoginPage from "./Pages/loginPage";
import RegisterPage from "./Pages/registerPage";
import ProtectedRoute from "./components/portectedRoutes";
import DashboardPage from "./Pages/dashboardPage";
import WorkspaceSettingsPage from "./Pages/workspaceSettingPage";
import AcceptInvitationPage from "./Pages/acceptInvitationPage";
import type { AppDispatch } from "./app/store";
import { logout } from "./features/auth/authSlice";
import { UNAUTHORIZED_EVENT } from "./services/api";
import { disconnectSocket } from "./services/socket";

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // The API rejected our token (expired or invalid): sign out cleanly.
  useEffect(() => {
    function handleUnauthorized() {
      disconnectSocket();
      dispatch(logout());
      navigate("/login", { replace: true });
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [dispatch, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<WorkspaceSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
