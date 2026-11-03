import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../app/store";
import { fetchCurrentUser } from "../features/auth/authSlice";

export default function ProtectedRoute() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { token, user, isInitializing } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (token && !user) void dispatch(fetchCurrentUser());
  }, [token, user, dispatch]);

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (isInitializing) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        Loading your workspace...
      </main>
    );
  }

  return <Outlet />;
}
