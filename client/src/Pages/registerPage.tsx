import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { safeRedirect } from "../utils/redirect";
import type { AppDispatch, RootState } from "../app/store";
import { registerUser } from "../features/auth/authSlice";

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  const { isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      await dispatch(
        registerUser({ name, email, password })
      ).unwrap();

      navigate(redirect ?? "/dashboard", { replace: true });
    } catch {
      // Display the Redux error below.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-8"
      >
        <div>
          <h1 className="text-3xl font-semibold">Create your account</h1>
          <p className="mt-2 text-slate-400">
            Start organizing your team's work.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm">Full name</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-3"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

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
            autoComplete="new-password"
            minLength={8}
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
          {isLoading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-slate-400">
          Already registered?{" "}
          <Link className="text-indigo-300" to={`/login${query}`}>
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}