import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";
import { getApiError } from "../../utils/errors";

interface Comment {
  _id: string;
  body: string;
  createdAt: string;
  authorId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  taskId: string;
}

interface Props {
  workspaceId: string;
  projectId: string;
  taskId: string;
  currentUserId?: string;
  canModerate: boolean;
}

export default function CommentPanel({
  workspaceId,
  projectId,
  taskId,
  currentUserId,
  canModerate,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl =
    `/workspaces/${workspaceId}/projects/${projectId}` +
    `/tasks/${taskId}/comments`;

  const loadComments = useCallback(async () => {
    try {
      setError("");

      const response = await api.get<{ comments: Comment[] }>(baseUrl);
      setComments(response.data.comments);
    } catch (err) {
      setError(getApiError(err, "Failed to load comments."));
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useWorkspaceEvents(workspaceId, {
    "comment:created": (comment: Comment) => {
      if (String(comment.taskId) !== taskId) return;

      setComments((current) =>
        current.some((item) => item._id === comment._id)
          ? current
          : [...current, comment]
      );
    },
    "comment:deleted": (payload: { _id: string; taskId: string }) => {
      if (String(payload.taskId) !== taskId) return;

      setComments((current) =>
        current.filter((item) => item._id !== payload._id)
      );
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    try {
      setError("");

      const response = await api.post<{ comment: Comment }>(baseUrl, {
        body: trimmedBody,
      });

      setComments((current) =>
        current.some((item) => item._id === response.data.comment._id)
          ? current
          : [...current, response.data.comment]
      );

      setBody("");
    } catch (err) {
      setError(getApiError(err, "Failed to add comment."));
    }
  }

  async function handleDelete(commentId: string) {
    try {
      setError("");
      await api.delete(`${baseUrl}/${commentId}`);
      setComments((current) => current.filter((item) => item._id !== commentId));
    } catch (err) {
      setError(getApiError(err, "Failed to delete comment."));
    }
  }

  return (
    <section className="space-y-4">
      {loading ? (
        <p className="text-sm text-slate-400">Loading comments...</p>
      ) : (
        <div className="max-h-80 space-y-4 overflow-y-auto">
          {comments.map((comment) => {
            const canDelete =
              canModerate || comment.authorId?._id === currentUserId;

            return (
              <article key={comment._id} className="rounded-lg bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {comment.authorId?.name ?? "Former member"}
                  </p>

                  <div className="flex items-center gap-3">
                    <time className="text-xs text-slate-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </time>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(comment._id)}
                        className="text-xs text-slate-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {comment.body}
                </p>
              </article>
            );
          })}

          {comments.length === 0 && (
            <p className="text-sm text-slate-500">
              No comments yet. Start the conversation.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          className="w-full rounded-lg border border-white/10 bg-slate-950 p-3"
          placeholder="Write a comment..."
          rows={3}
          maxLength={5000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />

        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg bg-indigo-500 px-4 py-2 disabled:opacity-50"
        >
          Send comment
        </button>
      </form>
    </section>
  );
}
