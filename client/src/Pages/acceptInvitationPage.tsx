import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LoaderCircle, MailCheck, TriangleAlert } from "lucide-react";
import type { AppDispatch, RootState } from "../app/store";
import { fetchCurrentUser, logout } from "../features/auth/authSlice";
import { acceptWorkspaceInvitation } from "../services/workspaceInvitationService";
import { disconnectSocket } from "../services/socket";
import { getApiError } from "../utils/errors";

// Landing page for the link in invitation emails: /accept-invitation?token=...
export default function AcceptInvitationPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("token") ?? "";

  const { token: authToken, user, isInitializing } = useSelector(
    (state: RootState) => state.auth
  );

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const redirect = encodeURIComponent(
    `/accept-invitation?token=${invitationToken}`
  );

  useEffect(() => {
    if (authToken && !user) void dispatch(fetchCurrentUser());
  }, [authToken, user, dispatch]);

  async function handleAccept() {
    setAccepting(true);
    setError("");

    try {
      const result = await acceptWorkspaceInvitation(invitationToken);

      localStorage.setItem("teamflow_workspace_id", result.workspaceId);
      navigate("/dashboard", {
        replace: true,
        state: { workspaceId: result.workspaceId },
      });
    } catch (err) {
      setError(getApiError(err, "Couldn't accept the invitation."));
      setAccepting(false);
    }
  }

  function switchAccount() {
    disconnectSocket();
    dispatch(logout());
    navigate(`/login?redirect=${redirect}`);
  }

  let content;

  if (!invitationToken) {
    content = (
      <>
        <TriangleAlert className="text-amber-300" />
        <h1 className="text-2xl font-semibold">Invitation link incomplete</h1>
        <p className="text-slate-400">
          This link is missing its invitation token. Open the link from your
          invitation email again.
        </p>
        <Link className="text-indigo-300" to="/dashboard">
          Go to dashboard
        </Link>
      </>
    );
  } else if (!authToken) {
    content = (
      <>
        <MailCheck className="text-indigo-300" />
        <h1 className="text-2xl font-semibold">You're invited to TeamFlow</h1>
        <p className="text-slate-400">
          Sign in with the email address the invitation was sent to, or create
          an account with it, to join the workspace.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium"
            to={`/login?redirect=${redirect}`}
          >
            Sign in
          </Link>
          <Link
            className="rounded-lg border border-white/10 px-5 py-2.5"
            to={`/register?redirect=${redirect}`}
          >
            Create account
          </Link>
        </div>
      </>
    );
  } else if (isInitializing || !user) {
    content = (
      <p className="flex items-center gap-2 text-slate-400">
        <LoaderCircle className="animate-spin" size={18} /> Checking your
        account...
      </p>
    );
  } else {
    content = (
      <>
        <MailCheck className="text-indigo-300" />
        <h1 className="text-2xl font-semibold">Join workspace</h1>
        <p className="text-slate-400">
          You're signed in as <strong className="text-slate-200">{user.email}</strong>.
          Accept the invitation to join the workspace.
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={accepting}
            className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium disabled:opacity-50"
          >
            {accepting ? "Joining..." : "Accept invitation"}
          </button>

          <button
            type="button"
            onClick={switchAccount}
            className="text-sm text-indigo-300 hover:underline"
          >
            Use a different account
          </button>
        </div>
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="flex w-full max-w-md flex-col items-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-8">
        {content}
      </section>
    </main>
  );
}
