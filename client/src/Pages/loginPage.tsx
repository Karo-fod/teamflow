import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { safeRedirect } from "../utils/redirect";
import type { AppDispatch, RootState } from "../app/store";
import { loginUser } from "../features/auth/authSlice";
import { connectSocket } from "../services/socket";

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  const { isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      connectSocket(result.token);
      navigate(redirect ?? "/dashboard", { replace: true });
    } catch {
      // Redux stores the error for display below.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-8"
      >
        <div>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-slate-400">
            Sign in to your TeamFlow workspace.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm">Email</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-3"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm">Password</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-3"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          className="w-full rounded-lg bg-indigo-500 p-3 font-medium disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-sm text-slate-400">
          Don't have an account?{" "}
          <Link className="text-indigo-300" to={`/register${query}`}>
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}